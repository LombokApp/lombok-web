export interface SessionData {
  readonly accessToken: string
  readonly refreshToken?: string
  readonly expiresAt: Date
}
