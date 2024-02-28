import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'

import { AppController } from './app.controller'
import { AppService } from './app.service'

describe('AppController', () => {
  let appController: AppController

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile()

    appController = app.get<AppController>(AppController)
  })

  describe('root', () => {
    it(`should return "{ version: '1.0.0' }"`, () => {
      expect(appController.getAppInfo()).toEqual({ version: '1.0.0' })
    })
  })
})
