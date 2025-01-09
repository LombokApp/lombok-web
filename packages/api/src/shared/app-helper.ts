import type { INestApplication } from '@nestjs/common'

export const appReference: {
  app: INestApplication | undefined
  appInitializing: Promise<INestApplication> | undefined
} = {
  app: undefined,
  appInitializing: undefined,
}

export async function getApp() {
  if (!appReference.appInitializing && !appReference.app) {
    console.log(
      'WARNING: App reference does not exist. You may have called this function too early.',
    )
  }
  return appReference.appInitializing
}

export function setApp(app: INestApplication) {
  appReference.app = app
}

export function setAppInitializing(
  initPromise: Promise<INestApplication<unknown>>,
) {
  appReference.appInitializing = initPromise
}
