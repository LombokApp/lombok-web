import jwtDecode, { InvalidTokenError } from 'jwt-decode'

export const verifyToken = (
  token: string | undefined,
  expWindowMs: number = 1000 * 60,
): token is string => {
  if (token === undefined) {
    return false
  }

  let payload: unknown

  try {
    payload = jwtDecode(token)
  } catch (error) {
    if (!(error instanceof InvalidTokenError)) {
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

  return !(Date.now() + expWindowMs > expiresAt)
}
