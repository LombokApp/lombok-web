import * as jwtDecode from 'jwt-decode'

export const verifyToken = (
  token: string | undefined,
  expWindowMs: number = 1000 * 60,
): token is string => {
  if (!token) {
    // debugger
  }
  if (token === undefined) {
    return false
  }

  let payload: unknown

  try {
    payload = jwtDecode.jwtDecode(token)
  } catch (error) {
    if (!(error instanceof jwtDecode.InvalidTokenError)) {
      throw error
    }
    payload = {}
  }

  if (!('exp' in (payload as { exp: unknown }))) {
    return false
  }

  const { exp } = payload as { exp: unknown }

  if (typeof exp !== 'number') {
    return false
  }

  const expiresAt = exp * 1000
  const hasExpired = Date.now() + expWindowMs > expiresAt

  return !hasExpired
}
