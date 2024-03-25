import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'

import { AuthService } from '../services/auth.service'
import { AuthController } from './auth.controller'

describe('AuthController', () => {
  let authController: AuthController

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [AuthService],
    }).compile()

    authController = app.get<AuthController>(AuthController)
  })

  describe('/auth/signup', () => {
    it(`should return "{ version: '1.0.0' }"`, () => {
      expect(authController.login({ login: '', password: '' })).toEqual({
        version: '1.0.0',
      })
    })
  })
})
