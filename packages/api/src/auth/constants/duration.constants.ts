/* eslint-disable @typescript-eslint/prefer-literal-enum-member */
/**
 * Auth token and key durations in _seconds_.
 */
export const enum AuthDurationSeconds {
  SessionAbsolute = 30 * 24 * 60 * 60,
  SessionSliding = 15 * 24 * 60 * 60,
  EmailVerification = 24 * 60 * 60,
  PasswordChange = 60 * 60,
  AppWorker = 30 * 60, // max time a worker can run for
  DockerContainerAppToken = 24 * 60 * 60, // long-lived app token for persistent docker containers
  AppActorAccessToken = 15 * 60, // app actor access tokens (runtime workers, shared docker containers)
  AppUserActorAccessToken = 5 * 60, // app_user actor access tokens (UI sessions and worker-context tokens)
}

/**
 * Auth token and key durations in _milliseconds_.
 */
export const enum AuthDurationMilliseconds {
  SessionAbsolute = AuthDurationSeconds.SessionAbsolute * 1000,
  SessionSliding = AuthDurationSeconds.SessionSliding * 1000,
  EmailVerification = AuthDurationSeconds.EmailVerification * 1000,
  PasswordChange = AuthDurationSeconds.PasswordChange * 1000,
}
/* eslint-enable @typescript-eslint/prefer-literal-enum-member */
