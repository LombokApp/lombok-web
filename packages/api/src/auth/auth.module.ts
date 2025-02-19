import {
  forwardRef,
  Global,
  Inject,
  Module,
  OnModuleInit,
} from '@nestjs/common'
import nestJSConfig, { ConfigModule } from '@nestjs/config'
import { eq, sql } from 'drizzle-orm'
import { coreConfig } from 'src/core/config'
import { OrmService } from 'src/orm/orm.service'
import { usersTable } from 'src/users/entities/user.entity'
import { UsersModule } from 'src/users/users.module'

import { authConfig } from './config'
import { AuthController } from './controllers/auth.controller'
import { AuthService } from './services/auth.service'
import { JWTService } from './services/jwt.service'
import { SessionService } from './services/session.service'

@Global()
@Module({
  imports: [
    ConfigModule.forFeature(authConfig),
    ConfigModule.forFeature(coreConfig),
    forwardRef(() => UsersModule),
  ],
  controllers: [AuthController],
  providers: [AuthService, JWTService, SessionService],
  exports: [AuthService, JWTService, SessionService],
})
export class AuthModule implements OnModuleInit {
  constructor(
    private readonly authService: AuthService,
    private readonly ormService: OrmService,
    @Inject(coreConfig.KEY)
    private readonly _coreConfig: nestJSConfig.ConfigType<typeof coreConfig>,
  ) {}
  onModuleInit() {
    void this.ormService.waitForInit().then(async () => {
      if (this._coreConfig.initialUser) {
        const [{ count: userCountStr = '0' }] = await this.ormService.db
          .select({ count: sql<string | null>`count(*)` })
          .from(usersTable)
        const userCount = parseInt(userCountStr ?? '0', 10)
        if (userCount === 0) {
          console.log('Creating initial user:', this._coreConfig.initialUser)
          await this.authService.signup({
            password: '0000',
            username: this._coreConfig.initialUser,
          })
          this.ormService.db
            .update(usersTable)
            .set({ isAdmin: true })
            .where(eq(usersTable.username, this._coreConfig.initialUser))
        }
      }
    })
  }
}
