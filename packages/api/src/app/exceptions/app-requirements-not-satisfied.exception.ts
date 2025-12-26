import { AppBaseInstallException } from './app-install-base.exception'

export class AppRequirementsNotSatisfiedException extends AppBaseInstallException {
  name = AppRequirementsNotSatisfiedException.name
}
