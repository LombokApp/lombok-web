import fs from 'fs'

// eslint-disable-next-line @typescript-eslint/require-await
export default async function (/*globalConfig, projectConfig*/) {
  fs.mkdirSync('/apps-test/core/')
  fs.copyFileSync(
    '/usr/src/app/apps/core/config.json',
    '/apps-test/core/config.json',
  )
}
