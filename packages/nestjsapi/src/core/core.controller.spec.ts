import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'

import { AppController } from './core.controller'
import { CoreService } from './core.service'

describe('AppController', () => {
  let appController: AppController

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [CoreService],
    }).compile()

    appController = app.get<AppController>(AppController)
  })

  describe('root', () => {
    it(`should return "{ version: '1.0.0' }"`, () => {
      expect(appController.getAppInfo()).toEqual({ version: '1.0.0' })
    })
  })
})
