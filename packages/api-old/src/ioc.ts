import type { IocContainer } from '@tsoa/runtime'
import type { InjectionToken } from 'tsyringe'
import { container } from 'tsyringe'

export const resolveDependency = <T>(token: InjectionToken<T>): T => {
  return container.resolve<T>(token)
}

// https://tsoa-community.github.io/docs/di.html#ioc-module
export const iocContainer: IocContainer = {
  get: <T>(controller: { prototype: T }): T =>
    container.resolve<T>(controller as never),
}
