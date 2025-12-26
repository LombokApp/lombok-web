import { AppBaseInstallException } from './app-install-base.exception'

export class AppMaxFileSizeException extends AppBaseInstallException {
  name = AppMaxFileSizeException.name

  constructor(message: string) {
    super(message)
    this.name = AppMaxFileSizeException.name
  }
}
