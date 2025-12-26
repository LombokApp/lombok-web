import { AppBaseInstallException } from './app-install-base.exception'

export class AppMaxSizeException extends AppBaseInstallException {
  name = AppMaxSizeException.name

  constructor(message: string) {
    super(message)
    this.name = AppMaxSizeException.name
  }
}
