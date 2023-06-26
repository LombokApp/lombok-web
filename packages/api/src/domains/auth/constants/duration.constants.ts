/* eslint-disable @typescript-eslint/prefer-literal-enum-member */
/**
 * Auth token and key durations in _milliseconds_.
 */
export const enum AuthDurationMs {
  ApiKeyDefault = 365 * 24 * 60 * 60 * 1000,
  SessionAbsolute = 30 * 24 * 60 * 60 * 1000,
  SessionSliding = 15 * 24 * 60 * 60 * 1000,
  EmailVerification = 24 * 60 * 60 * 1000,
  PasswordChange = 60 * 60 * 1000,
}

/**
 * Auth token and key durations in _seconds_.
 */
export const enum AuthDurationSeconds {
  AccessToken = 60 * 60,
}
/* eslint-enable @typescript-eslint/prefer-literal-enum-member */
