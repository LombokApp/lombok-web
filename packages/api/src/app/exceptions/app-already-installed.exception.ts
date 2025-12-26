import { AppBaseInstallException } from './app-install-base.exception'

export class AppAlreadyInstalledException extends AppBaseInstallException {
  name = AppAlreadyInstalledException.name
}
