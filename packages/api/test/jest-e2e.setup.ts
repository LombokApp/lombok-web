import fs from 'fs'

const APPS_PATH = '/apps-test/core/'

// eslint-disable-next-line @typescript-eslint/require-await
export default async function (/*globalConfig, projectConfig*/) {
  if (!fs.existsSync(APPS_PATH)) {
    fs.mkdirSync(APPS_PATH)
  }
  fs.copyFileSync(
    '/usr/src/app/apps/core/config.json',
    '/apps-test/core/config.json',
  )
}
