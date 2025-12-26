import { AppBaseInstallException } from './app-install-base.exception'

export class AppInvalidException extends AppBaseInstallException {
  name = AppInvalidException.name
}
