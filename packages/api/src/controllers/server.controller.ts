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
import type { ServerLocationData } from '../domains/s3/transfer-objects/s3-location.dto'
import { ServerLocationInputData } from '../domains/s3/transfer-objects/s3-location.dto'
import { ServerLocationType } from '../domains/server/constants/server.constants'
import { ServerConfigurationService } from '../domains/server/services/server-configuration.service'
import type { ServerSettings } from '../domains/server/transfer-objects/settings.dto'
import { UserService } from '../domains/user/services/user.service'
import type { UserData } from '../domains/user/transfer-objects/user.dto'
import {
  CreateUserData,
  UpdateUserData,
} from '../domains/user/transfer-objects/user.dto'

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
    const results =
      await this.serverConfigurationService.listConfiguredServerLocationsAsUser(
        req.viewer.id,
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
    const record =
      await this.serverConfigurationService.addServerLocationServerConfigurationAsUser(
        req.viewer.id,
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
    const _user = await this.userService.getById({ id: req.viewer.id })

    await this.serverConfigurationService.deleteServerLocationServerConfigurationAsUser(
      req.viewer.id,
      locationType,
      locationId,
    )

    return true
  }

  @Security(AuthScheme.AccessToken, [AuthScope.ReadUsers])
  @OperationId('listUsers')
  @Get('/users')
  async listUsers(@Request() req: Express.Request): Promise<ListUsersResponse> {
    const [results, count] = await this.userService.listUsersAsAdmin(
      req.viewer.id,
      {
        limit: 100,
        offset: 0,
      },
    )
    return {
      result: results.map((result) => result.toUserData()),
      meta: { totalCount: count },
    }
  }

  @Security(AuthScheme.AccessToken, [AuthScope.ReadUsers])
  @OperationId('getUser')
  @Get('/users/:userId')
  async getUsers(
    @Request() req: Express.Request,
    @Path() userId: string,
  ): Promise<{ result: UserData }> {
    const result = await this.userService.getUserByIdAsAdmin(
      req.viewer.id,
      userId,
    )
    return {
      result: result.toUserData(),
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
    const user = await this.userService.createUserAsUser(req.viewer, body)
    return { user: user.toUserData() }
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
    const user = await this.userService.updateUserAsUser(req.viewer, {
      id: userId,
      ...body,
    })
    return { user: user.toUserData() }
  }

  @Security(AuthScheme.AccessToken, [AuthScope.CreateUsers])
  @OperationId('deleteUser')
  @Delete('/users/:userId')
  async deleteUser(@Request() req: Express.Request, @Path() userId: string) {
    await this.userService.deleteUserAsUser(req.viewer, userId)
    return true
  }

  @Security(AuthScheme.AccessToken, [AuthScope.ReadServerSettings])
  @OperationId('getSettings')
  @Get('/settings')
  async getSettings(
    @Request() req: Express.Request,
  ): Promise<{ settings: ServerSettings }> {
    return {
      settings: await this.serverConfigurationService.getServerSettingsAsUser(
        req.viewer,
      ),
    }
  }

  @Security(AuthScheme.AccessToken, [AuthScope.UpdateServerSettings])
  @OperationId('updateSetting')
  @Put('/settings/:settingsKey')
  async updateSetting(
    @Request() req: Express.Request,
    @Path() settingsKey: string,
    @Body() settingsValue: { value: any },
  ): Promise<{ settings: ServerSettings }> {
    await this.serverConfigurationService.setServerSettingAsUser(
      req.viewer,
      settingsKey,
      settingsValue.value,
    )
    return {
      settings: await this.serverConfigurationService.getServerSettingsAsUser(
        req.viewer,
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
    await this.serverConfigurationService.resetServerSettingAsUser(
      req.viewer,
      settingsKey,
    )
    return {
      settings: await this.serverConfigurationService.getServerSettingsAsUser(
        req.viewer,
      ),
    }
  }
}
