import fs from 'fs'

const APPS_PATH = '/apps-test/core/'

if (!fs.existsSync(APPS_PATH)) {
  fs.mkdirSync(APPS_PATH)
}
fs.copyFileSync(
  '/usr/src/app/apps/core/config.json',
  '/apps-test/core/config.json',
)
