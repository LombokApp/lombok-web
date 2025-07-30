import type { TokenData } from './types'

export class TokenManager {
  private currentToken: TokenData | null = null
  private onTokenReceived?: (token: TokenData) => void
  private onTokenRefreshed?: (token: TokenData) => void
  private onLogout?: () => void

  constructor(config?: {
    onTokenReceived?: (token: TokenData) => void
    onTokenRefreshed?: (token: TokenData) => void
    onLogout?: () => void
  }) {
    this.onTokenReceived = config?.onTokenReceived
    this.onTokenRefreshed = config?.onTokenRefreshed
    this.onLogout = config?.onLogout
  }

  public setToken(token: TokenData): void {
    this.currentToken = token
    this.onTokenReceived?.(token)
  }

  public getToken(): TokenData | null {
    return this.currentToken
  }

  public getAccessToken(): string | undefined {
    return this.currentToken?.accessToken
  }

  public getRefreshToken(): string | undefined {
    return this.currentToken?.refreshToken
  }

  public isTokenExpired(): boolean {
    if (!this.currentToken?.expiresAt) {
      return false
    }
    return Date.now() >= this.currentToken.expiresAt
  }

  public refreshToken(newToken: TokenData): void {
    this.currentToken = newToken
    this.onTokenRefreshed?.(newToken)
  }

  public clearToken(): void {
    this.currentToken = null
  }

  public logout(): void {
    this.clearToken()
    this.onLogout?.()
  }

  public hasValidToken(): boolean {
    return !!this.currentToken?.accessToken && !this.isTokenExpired()
  }
}
