import type {
  ConnectedAppInstancesMap,
  ModuleConfig,
} from '@stellariscloud/types'
import {
  Body,
  Controller,
  Delete,
  Get,
  OperationId,
  Path,
  Post,
  Put,
  Request,
  Route,
  Security,
  Tags,
} from 'tsoa'
import { Lifecycle, scoped } from 'tsyringe'

import { AuthScheme } from '../domains/auth/constants/scheme.constants'
import { AuthScope } from '../domains/auth/constants/scope.constants'
import { ModuleService } from '../domains/module/services/module.service'
import { ServerLocationType } from '../domains/server/constants/server.constants'
import { ServerConfigurationService } from '../domains/server/services/server-configuration.service'
import type { ServerSettings } from '../domains/server/transfer-objects/settings.dto'
import type { ServerLocationData } from '../domains/storage-location/transfer-objects/s3-location.dto'
import { ServerLocationInputData } from '../domains/storage-location/transfer-objects/s3-location.dto'
import { UserService } from '../domains/user/services/user.service'
import type { UserData } from '../domains/user/transfer-objects/user.dto'
import {
  CreateUserData,
  UpdateUserData,
} from '../domains/user/transfer-objects/user.dto'
import { transformUserToUserDTO } from '../domains/user/transforms/user-dto.transform'
import { UnauthorizedError } from '../errors/auth.error'

export interface ListUsersResponse {
  meta: { totalCount: number }
  result: UserData[]
}

@scoped(Lifecycle.ContainerScoped)
@Route('server')
@Tags('Server')
export class ServerController extends Controller {
  constructor(
    private readonly userService: UserService,
    private readonly serverConfigurationService: ServerConfigurationService,
    private readonly modulesService: ModuleService,
  ) {
    super()
  }

  @Security(AuthScheme.AccessToken, [AuthScope.ReadUserFoldersLocation])
  @OperationId('listServerLocations')
  @Get('/settings/server-locations/:locationType')
  async listServerLocations(
    @Request() req: Express.Request,
    @Path() locationType: ServerLocationType,
  ): Promise<ServerLocationData[]> {
    if (!req.user) {
      throw new UnauthorizedError()
    }
    const results =
      await this.serverConfigurationService.listConfiguredServerLocationsAsUser(
        req.user.id,
        locationType,
      )

    return results
  }

  @Security(AuthScheme.AccessToken, [AuthScope.ReadMetadataLocation])
  @OperationId('addServerLocation')
  @Post('/settings/locations/:locationType')
  async addServerConfigLocation(
    @Request() req: Express.Request,
    @Body() payload: ServerLocationInputData,
    @Path() locationType: ServerLocationType,
  ): Promise<ServerLocationData> {
    if (!req.user) {
      throw new UnauthorizedError()
    }
    const record =
      await this.serverConfigurationService.addServerLocationServerConfigurationAsUser(
        req.user.id,
        locationType,
        payload,
      )

    return {
      id: record.id,
      name: record.name,
      accessKeyId: record.accessKeyId,
      endpoint: record.endpoint,
      bucket: record.bucket,
      prefix: record.prefix,
      region: record.region,
    }
  }

  @Security(AuthScheme.AccessToken, [AuthScope.ReadMetadataLocation])
  @OperationId('deleteServerLocation')
  @Delete('/settings/locations/:locationType/:locationId')
  async deleteServerConfigLocation(
    @Request() req: Express.Request,
    @Path() locationType: ServerLocationType,
    @Path() locationId: string,
  ) {
    if (!req.user) {
      throw new UnauthorizedError()
    }

    await this.serverConfigurationService.deleteServerLocationServerConfigurationAsUser(
      req.user.id,
      locationType,
      locationId,
    )

    return true
  }

  @Security(AuthScheme.AccessToken, [AuthScope.ReadUsers])
  @OperationId('listUsers')
  @Get('/users')
  async listUsers(@Request() req: Express.Request): Promise<ListUsersResponse> {
    if (!req.user) {
      throw new UnauthorizedError()
    }
    const { results, totalCount } = await this.userService.listUsersAsAdmin(
      req.user.id,
      {
        limit: 100,
        offset: 0,
      },
    )
    return {
      result: results.map((result) => transformUserToUserDTO(result)),
      meta: { totalCount },
    }
  }

  @Security(AuthScheme.AccessToken, [AuthScope.ReadUsers])
  @OperationId('getUser')
  @Get('/users/:userId')
  async getUsers(
    @Request() req: Express.Request,
    @Path() userId: string,
  ): Promise<{ result: UserData }> {
    if (!req.user) {
      throw new UnauthorizedError()
    }
    const result = await this.userService.getUserByIdAsAdmin(
      req.user.id,
      userId,
    )
    return {
      result: transformUserToUserDTO(result),
    }
  }

  @Security(AuthScheme.AccessToken, [AuthScope.CreateUsers])
  @OperationId('createUser')
  @Post('/users')
  async createUser(
    @Request() req: Express.Request,
    @Body()
    body: CreateUserData,
  ) {
    if (!req.user) {
      throw new UnauthorizedError()
    }
    const createdUser = await this.userService.createUserAsAdmin(req.user, body)
    return { user: transformUserToUserDTO(createdUser) }
  }

  @Security(AuthScheme.AccessToken, [AuthScope.CreateUsers])
  @OperationId('updateUser')
  @Put('/users/:userId')
  async updateUser(
    @Request() req: Express.Request,
    @Path() userId: string,
    @Body()
    body: UpdateUserData,
  ) {
    if (!req.user) {
      throw new UnauthorizedError()
    }

    const updatedUser = await this.userService.updateUserAsAdmin(req.user, {
      id: userId,
      ...body,
    })
    return { user: transformUserToUserDTO(updatedUser) }
  }

  @Security(AuthScheme.AccessToken, [AuthScope.CreateUsers])
  @OperationId('deleteUser')
  @Delete('/users/:userId')
  async deleteUser(@Request() req: Express.Request, @Path() userId: string) {
    if (!req.user) {
      throw new UnauthorizedError()
    }

    await this.userService.deleteUserAsAdmin(req.user, userId)
    return true
  }

  @Security(AuthScheme.AccessToken, [AuthScope.ReadServerSettings])
  @OperationId('getSettings')
  @Get('/settings')
  async getSettings(
    @Request() req: Express.Request,
  ): Promise<{ settings: ServerSettings }> {
    if (!req.user) {
      throw new UnauthorizedError()
    }
    return {
      settings: await this.serverConfigurationService.getServerSettingsAsUser(
        req.user,
      ),
    }
  }

  @Security(AuthScheme.AccessToken, [AuthScope.ReadServerModules])
  @OperationId('listModules')
  @Get('/modules')
  async listModules(@Request() req: Express.Request): Promise<{
    installed: { identifier: string; config: ModuleConfig }[]
    connected: ConnectedAppInstancesMap
  }> {
    if (!req.user) {
      throw new UnauthorizedError()
    }
    return this.modulesService.listModulesAsAdmin(req.user)
  }

  @Security(AuthScheme.AccessToken, [AuthScope.UpdateServerSettings])
  @OperationId('updateSetting')
  @Put('/settings/:settingsKey')
  async updateSetting(
    @Request() req: Express.Request,
    @Path() settingsKey: string,
    @Body() settingsValue: { value: any },
  ): Promise<{ settings: ServerSettings }> {
    if (!req.user) {
      throw new UnauthorizedError()
    }

    await this.serverConfigurationService.setServerSettingAsUser(
      req.user,
      settingsKey,
      settingsValue.value,
    )
    return {
      settings: await this.serverConfigurationService.getServerSettingsAsUser(
        req.user,
      ),
    }
  }

  @Security(AuthScheme.AccessToken, [AuthScope.UpdateServerSettings])
  @OperationId('resetSetting')
  @Delete('/settings/:settingsKey')
  async resetSetting(
    @Request() req: Express.Request,
    @Path() settingsKey: string,
  ): Promise<{ settings: ServerSettings }> {
    if (!req.user) {
      throw new UnauthorizedError()
    }
    await this.serverConfigurationService.resetServerSettingAsUser(
      req.user,
      settingsKey,
    )
    return {
      settings: await this.serverConfigurationService.getServerSettingsAsUser(
        req.user,
      ),
    }
  }

  // @Security(AuthScheme.AccessToken, [AuthScope.ReadServerWorkerKey])
  // @Response<ErrorResponse>('4XX')
  // @OperationId('listModuleInstances')
  // @Get('/workers')
  // async listServerWorkers(
  //   @Request() req: Express.Request,
  //   @Query() sort?: ModuleInstancesSort,
  //   @Query() limit?: number,
  //   @Query() offset?: number,
  // ) {
  //   if (!req.user) {
  //     throw new UnauthorizedError()
  //   }
  //   const result = await this.serverWorkerService.listServerWorkersAsAdmin(
  //     req.user,
  //     {
  //       limit,
  //       offset,
  //       sort,
  //     },
  //   )
  //   return {
  //     meta: result.meta,
  //     result: result.something,
  //   }
  // }
}
