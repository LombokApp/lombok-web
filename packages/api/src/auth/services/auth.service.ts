import { addMs, earliest, USERNAME_VALIDATORS_COMBINED } from '@lombokapp/utils'
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
} from '@nestjs/common'
import nestjsConfig from '@nestjs/config'
import { and, eq, or } from 'drizzle-orm'
import { OrmService } from 'src/orm/orm.service'
import { SIGNUP_ENABLED_CONFIG } from 'src/server/constants/server.constants'
import { serverSettingsTable } from 'src/server/entities/server-configuration.entity'
import type { NewUser, User } from 'src/users/entities/user.entity'
import { usersTable } from 'src/users/entities/user.entity'
import { v4 as uuidV4 } from 'uuid'

import { authConfig } from '../config'
import { AuthDurationMilliseconds } from '../constants/duration.constants'
import type { LoginCredentialsDTO } from '../dto/login-credentials.dto'
import type { SignupCredentialsDTO } from '../dto/signup-credentials.dto'
import { CompleteSSOSignupDTO } from '../dto/sso/complete-sso-signup.dto'
import { SSOCallbackResponse } from '../dto/sso/responses/sso-callback-response.dto'
import type { Session } from '../entities/session.entity'
import type {
  NewUserIdentity,
  UserIdentity,
} from '../entities/user-identity.entity'
import { userIdentitiesTable } from '../entities/user-identity.entity'
import { LoginInvalidException } from '../exceptions/login-invalid.exception'
import { SessionInvalidException } from '../exceptions/session-invalid.exception'
import { authHelper } from '../utils/auth-helper'
import { JWTService } from './jwt.service'
import type { ProviderUserInfo } from './oauth.service'
import { OAuthService } from './oauth.service'
import { SessionService } from './session.service'

/**
 * Calculates the sliding expiration of a session token based on the initial
 * creation timestamp.
 */
export const sessionExpiresAt = (createdAt: Date) =>
  earliest(
    addMs(new Date(), AuthDurationMilliseconds.SessionSliding),
    addMs(createdAt, AuthDurationMilliseconds.SessionAbsolute),
  )

@Injectable()
export class AuthService {
  sessionService: SessionService

  constructor(
    private readonly ormService: OrmService,
    private readonly oauthService: OAuthService,
    private readonly jwtService: JWTService,
    @Inject(authConfig.KEY)
    private readonly _authConfig: nestjsConfig.ConfigType<typeof authConfig>,
    @Inject(forwardRef(() => SessionService)) _sessionService,
  ) {
    this.sessionService = _sessionService as SessionService
  }

  async signup(data: SignupCredentialsDTO) {
    const signupEnabled =
      await this.ormService.db.query.serverSettingsTable.findFirst({
        where: eq(serverSettingsTable.key, SIGNUP_ENABLED_CONFIG.key),
      })

    if (signupEnabled?.value === false) {
      throw new ForbiddenException('Signups are not enabled.')
    }

    const passesValidation = USERNAME_VALIDATORS_COMBINED.safeParse(
      data.username,
    ).success

    if (!passesValidation) {
      throw new BadRequestException('Invalid username')
    }

    const user = await this.createSignup(data)
    // await this.sendEmailVerification(data.email)

    return user
  }

  async createSignup(data: SignupCredentialsDTO) {
    const { username, email } = data

    const existingByEmail = email
      ? await this.ormService.db.query.usersTable.findFirst({
          where: eq(usersTable.email, email),
        })
      : false

    if (email && existingByEmail) {
      throw new ConflictException(`User already exists with email "${email}".`)
    }

    const existingByUsername =
      await this.ormService.db.query.usersTable.findFirst({
        where: eq(usersTable.username, username),
      })

    if (existingByUsername) {
      throw new ConflictException(
        `User already exists with username "${username}".`,
      )
    }

    const now = new Date()
    const passwordSalt = authHelper.createPasswordSalt()
    const newUser: NewUser = {
      id: uuidV4(),
      email: data.email,
      isAdmin: false,
      emailVerified: false,
      username: data.username,
      passwordHash: authHelper
        .createPasswordHash(data.password, passwordSalt)
        .toString('hex'),
      passwordSalt,
      permissions: [],
      createdAt: now,
      updatedAt: now,
    }

    const [createdUser] = await this.ormService.db
      .insert(usersTable)
      .values(newUser)
      .returning()

    return createdUser
  }

  async login({ login, password }: LoginCredentialsDTO) {
    const user = await this.ormService.db.query.usersTable.findFirst({
      where: or(eq(usersTable.email, login), eq(usersTable.username, login)),
    })
    const passwordVerificationSuccess =
      user && this.verifyPassword(user, password)

    if (!passwordVerificationSuccess) {
      throw new LoginInvalidException()
    }

    const { session, accessToken, refreshToken } =
      await this.sessionService.createUserSession(user)

    return {
      user,
      accessToken,
      refreshToken,
      expiresAt: session.expiresAt,
    }
  }

  verifyPassword(user: User, password: string) {
    if (!user.passwordHash || !password || !user.passwordSalt) {
      return false
    }

    return (
      authHelper
        .createPasswordHash(password, user.passwordSalt)
        .compare(Buffer.from(user.passwordHash, 'hex')) === 0
    )
  }

  async extendSessionWithRefreshToken(refreshToken: string): Promise<{
    user: User
    session: Session
    accessToken: string
    refreshToken: string
  }> {
    const session =
      await this.sessionService.verifySessionWithRefreshToken(refreshToken)

    const user = await this.ormService.db.query.usersTable.findFirst({
      where: eq(usersTable.id, session.userId),
    })

    if (!user) {
      throw new SessionInvalidException()
    }

    const updated = await this.sessionService.extendSession(session)

    return {
      user,
      session: updated.session,
      accessToken: updated.accessToken,
      refreshToken: updated.refreshToken,
    }
  }

  // SSO Methods
  async initiateSSOSignup(provider: string, origin: string) {
    if (provider === 'google') {
      const authUrl = await this.oauthService.getGoogleAuthUrl(origin)
      return { authUrl }
    }
    throw new BadRequestException(`Unsupported provider: ${provider}`)
  }

  async handleSSOCallback(
    provider: string,
    code: string,
    origin: string,
  ): Promise<SSOCallbackResponse> {
    let providerUserInfo: ProviderUserInfo

    if (provider === 'google') {
      providerUserInfo = await this.oauthService.handleGoogleCallback(
        code,
        origin,
      )
    } else {
      throw new BadRequestException(`Unsupported provider: ${provider}`)
    }

    // Check if this SSO identity already exists
    const existingIdentity = await this.findIdentityByProvider(
      provider,
      providerUserInfo.id,
    )

    if (existingIdentity) {
      // Existing user - login
      const user = await this.findUserById(existingIdentity.userId)
      const { session, accessToken, refreshToken } =
        await this.sessionService.createUserSession(user)

      return {
        user,
        accessToken,
        refreshToken,
        expiresAt: session.expiresAt,
      }
    } else {
      // New user - need username selection
      const expiry = addMs(new Date(), 10 * 60 * 1000) // 10 minutes from now
      const dataToSign = JSON.stringify({
        provider,
        providerUserInfo,
        expiry: expiry.toISOString(),
      })
      const signature = authHelper.createSSOSignature(
        dataToSign,
        this._authConfig.authJwtSecret,
      )

      return {
        needsUsername: true,
        provider,
        providerUserInfo,
        expiry,
        signature,
        suggestedUsername: this.generateUsernameFromEmail(
          providerUserInfo.email || '',
        ),
      }
    }
  }

  async completeSSOSignup({
    username,
    providerData: { provider, providerUserInfo, expiry },
    signature,
  }: CompleteSSOSignupDTO) {
    const expiryDate = new Date(expiry)
    // Verify expiry timestamp
    if (new Date() > expiryDate) {
      throw new BadRequestException('SSO signup request has expired')
    }

    // Verify signature
    const dataToVerify = JSON.stringify({
      provider,
      providerUserInfo,
      expiry,
    })
    const isValidSignature = authHelper.verifySSOSignature(
      signature,
      dataToVerify,
      this._authConfig.authJwtSecret,
    )

    if (!isValidSignature) {
      throw new BadRequestException('Invalid signature')
    }

    const passesValidation =
      USERNAME_VALIDATORS_COMBINED.safeParse(username).success

    if (!passesValidation) {
      throw new BadRequestException('Invalid username')
    }

    // Check username availability
    if (await this.usernameExists(username)) {
      throw new ConflictException(`Username "${username}" is already taken`)
    }

    // Create new user
    const now = new Date()
    const newUser: NewUser = {
      id: uuidV4(),
      username,
      email: providerUserInfo.email,
      passwordHash: null, // No password for SSO-only users
      passwordSalt: null,
      isAdmin: false,
      emailVerified: false,
      permissions: [],
      createdAt: now,
      updatedAt: now,
    }

    const [user] = await this.ormService.db
      .insert(usersTable)
      .values(newUser)
      .returning()

    // Create identity record
    await this.createIdentity(user.id, provider, providerUserInfo)

    const { session, accessToken, refreshToken } =
      await this.sessionService.createUserSession(user)

    return {
      user,
      accessToken,
      refreshToken,
      expiresAt: session.expiresAt,
    }
  }

  async linkSSOProvider(
    userId: string,
    provider: string,
    code: string,
    origin: string,
  ) {
    let providerUserInfo: ProviderUserInfo

    if (provider === 'google') {
      providerUserInfo = await this.oauthService.handleGoogleCallback(
        code,
        origin,
      )
    } else {
      throw new BadRequestException(`Unsupported provider: ${provider}`)
    }

    // Check if this SSO identity is already linked to another user
    const existingIdentity = await this.findIdentityByProvider(
      provider,
      providerUserInfo.id,
    )
    if (existingIdentity) {
      throw new ConflictException(
        `This ${provider} account is already linked to another user`,
      )
    }

    // Check if user already has this provider linked
    const userHasProvider =
      await this.ormService.db.query.userIdentitiesTable.findFirst({
        where: and(
          eq(userIdentitiesTable.userId, userId),
          eq(userIdentitiesTable.provider, provider),
        ),
      })

    if (userHasProvider) {
      throw new ConflictException(
        `You already have a ${provider} account linked`,
      )
    }

    // Link the provider
    await this.createIdentity(userId, provider, providerUserInfo)
    return { success: true }
  }

  private async createIdentity(
    userId: string,
    provider: string,
    providerUserInfo: ProviderUserInfo,
  ) {
    const now = new Date()
    const newIdentity: NewUserIdentity = {
      id: uuidV4(),
      userId,
      provider,
      providerUserId: providerUserInfo.id,
      providerEmail: providerUserInfo.email,
      providerName: providerUserInfo.name,
      createdAt: now,
      updatedAt: now,
    }

    await this.ormService.db.insert(userIdentitiesTable).values(newIdentity)
  }

  private async findIdentityByProvider(
    provider: string,
    providerUserId: string,
  ): Promise<UserIdentity | undefined> {
    return this.ormService.db.query.userIdentitiesTable.findFirst({
      where: and(
        eq(userIdentitiesTable.provider, provider),
        eq(userIdentitiesTable.providerUserId, providerUserId),
      ),
    })
  }

  private async findUserById(userId: string): Promise<User> {
    const user = await this.ormService.db.query.usersTable.findFirst({
      where: eq(usersTable.id, userId),
    })

    if (!user) {
      throw new SessionInvalidException()
    }

    return user
  }

  private async usernameExists(username: string): Promise<boolean> {
    const user = await this.ormService.db.query.usersTable.findFirst({
      where: eq(usersTable.username, username),
    })
    return !!user
  }

  private generateUsernameFromEmail(email: string): string {
    if (!email) {
      return 'user'
    }

    const localPart = email.split('@')[0]
    return (
      localPart
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .substring(0, 20) || 'user'
    )
  }
}
