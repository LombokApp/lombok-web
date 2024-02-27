import { Injectable } from '@nestjs/common'

@Injectable()
export class AuthService {
  login({}: { login: string; password: string }): string {
    return 'Hello World!'
  }
}
