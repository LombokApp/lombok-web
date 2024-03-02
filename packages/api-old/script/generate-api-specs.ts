import fs from 'fs'
import path from 'path'

import spec from '../src/generated/openapi.json'

fs.writeFileSync(
  path.join(__dirname, '../src/generated/openapi.json'),
  JSON.stringify(
    { ...spec, servers: [{ url: 'http://localhost:3001/api/v1' }] },
    null,
    2,
  ),
)
