import { Injectable } from '@nestjs/common'

@Injectable()
export class AuthService {
  login(_input: { login: string; password: string }): string {
    return 'Hello World!'
  }
}
