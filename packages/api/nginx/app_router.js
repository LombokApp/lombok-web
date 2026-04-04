var backends = {}

try {
  backends = JSON.parse(
    require('fs').readFileSync('/etc/nginx/app_frontend_proxies.json'),
  )
} catch (e) {
  // No overrides configured
}

function getAppBackend(r) {
  var appname = r.variables.appname.split('_')[0]
  if (appname && backends[appname]) {
    return backends[appname]
  }
  return r.variables.default_app_backend
}

export default { getAppBackend }
