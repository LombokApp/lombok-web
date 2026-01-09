import {
  forwardRef,
  Global,
  Inject,
  Logger,
  Module,
  OnModuleInit,
} from '@nestjs/common'
import nestJSConfig, { ConfigModule } from '@nestjs/config'
import { count, eq, sql } from 'drizzle-orm'
import { coreConfig } from 'src/core/config'
import { OrmService } from 'src/orm/orm.service'
import { ServerModule } from 'src/server/server.module'
import { usersTable } from 'src/users/entities/user.entity'
import { UsersModule } from 'src/users/users.module'

import { authConfig } from './config'
import { AuthController } from './controllers/auth.controller'
import { SSOController } from './controllers/sso.controller'
import { AuthService } from './services/auth.service'
import { JWTService } from './services/jwt.service'
import { OAuthService } from './services/oauth.service'
import { SessionService } from './services/session.service'

@Global()
@Module({
  imports: [
    ConfigModule.forFeature(authConfig),
    ConfigModule.forFeature(coreConfig),
    forwardRef(() => UsersModule),
    forwardRef(() => ServerModule),
  ],
  controllers: [AuthController, SSOController],
  providers: [AuthService, JWTService, OAuthService, SessionService],
  exports: [AuthService, JWTService, OAuthService, SessionService],
})
export class AuthModule implements OnModuleInit {
  private readonly logger = new Logger(AuthModule.name)
  constructor(
    private readonly authService: AuthService,
    private readonly ormService: OrmService,
    @Inject(coreConfig.KEY)
    private readonly _coreConfig: nestJSConfig.ConfigType<typeof coreConfig>,
  ) {}
  onModuleInit() {
    void this.ormService.waitForInit().then(async () => {
      if (this._coreConfig.initialUser) {
        const [userCountResult] = await this.ormService.db
          .select({ count: count(sql`*`) })
          .from(usersTable)
        if (userCountResult?.count === 0) {
          this.logger.log(
            'Creating initial user:',
            this._coreConfig.initialUser,
          )
          const initialUser = await this.authService.signup({
            password: '0000',
            username: this._coreConfig.initialUser,
          })
          await this.ormService.db
            .update(usersTable)
            .set({ isAdmin: true })
            .where(eq(usersTable.id, initialUser.id))
        }
      }
    })
  }
}
