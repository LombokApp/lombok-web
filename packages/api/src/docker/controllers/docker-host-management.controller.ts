import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
  UsePipes,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import express from 'express'
import { ZodValidationPipe } from 'nestjs-zod'
import { AuthGuard } from 'src/auth/guards/auth.guard'
import { ApiStandardErrorResponses } from 'src/shared/decorators/api-standard-error-responses.decorator'

import {
  DockerHostInputDTO,
  DockerHostUpdateDTO,
} from '../dto/docker-host-input.dto'
import {
  DockerProfileAssignmentInputDTO,
  DockerProfileAssignmentUpdateDTO,
} from '../dto/docker-profile-assignment-input.dto'
import { DockerProfileAssignmentListQueryParamsDTO } from '../dto/docker-profile-assignment-list-query-params.dto'
import {
  DockerRegistryCredentialInputDTO,
  DockerRegistryCredentialUpdateDTO,
} from '../dto/docker-registry-credential-input.dto'
import {
  DockerStandaloneContainerDesiredStatusDTO,
  DockerStandaloneContainerInputDTO,
  DockerStandaloneContainerUpdateDTO,
} from '../dto/docker-standalone-container-input.dto'
import { DockerStandaloneContainerListQueryParamsDTO } from '../dto/docker-standalone-container-list-query-params.dto'
import {
  DockerHostDeleteResponse,
  DockerHostListResponse,
  DockerHostResponse,
  DockerProfileAssignmentDeleteResponse,
  DockerProfileAssignmentListResponse,
  DockerProfileAssignmentResponse,
  DockerProfileResolveResponse,
  DockerRegistryCredentialDeleteResponse,
  DockerRegistryCredentialListResponse,
  DockerRegistryCredentialResponse,
  DockerStandaloneContainerDeleteResponse,
  DockerStandaloneContainerListResponse,
  DockerStandaloneContainerResponse,
} from '../dto/responses/docker-host-management-responses.dto'
import {
  transformDockerHostToDTO,
  transformDockerProfileAssignmentToDTO,
  transformDockerRegistryCredentialToDTO,
  transformDockerStandaloneContainerToDTO,
} from '../dto/transforms/docker-host-management.transforms'
import { DockerHostManagementService } from '../services/docker-host-management.service'

function assertAdmin(req: express.Request): void {
  if (!req.user?.isAdmin) {
    throw new UnauthorizedException()
  }
}

// ─── Docker Hosts ──────────────────────────────────────────────────────────

@Controller('/api/v1/docker/hosts')
@ApiTags('DockerHostManagement')
@ApiBearerAuth()
@UsePipes(ZodValidationPipe)
@UseGuards(AuthGuard)
@ApiStandardErrorResponses()
export class DockerHostsController {
  constructor(private readonly service: DockerHostManagementService) {}

  @Get()
  async list(@Req() req: express.Request): Promise<DockerHostListResponse> {
    assertAdmin(req)
    const hosts = await this.service.listHosts()
    return { result: hosts.map(transformDockerHostToDTO) }
  }

  @Get('/:id')
  async get(
    @Req() req: express.Request,
    @Param('id') id: string,
  ): Promise<DockerHostResponse> {
    assertAdmin(req)
    return {
      result: transformDockerHostToDTO(await this.service.getHostOrThrow(id)),
    }
  }

  @Post()
  async create(
    @Req() req: express.Request,
    @Body() input: DockerHostInputDTO,
  ): Promise<DockerHostResponse> {
    assertAdmin(req)
    return {
      result: transformDockerHostToDTO(await this.service.createHost(input)),
    }
  }

  @Put('/:id')
  async update(
    @Req() req: express.Request,
    @Param('id') id: string,
    @Body() input: DockerHostUpdateDTO,
  ): Promise<DockerHostResponse> {
    assertAdmin(req)
    return {
      result: transformDockerHostToDTO(
        await this.service.updateHost(id, input),
      ),
    }
  }

  @Delete('/:id')
  async delete(
    @Req() req: express.Request,
    @Param('id') id: string,
  ): Promise<DockerHostDeleteResponse> {
    assertAdmin(req)
    await this.service.deleteHost(id)
    return { success: true }
  }
}

// ─── Registry Credentials ──────────────────────────────────────────────────

@Controller('/api/v1/docker/registry-credentials')
@ApiTags('DockerHostManagement')
@ApiBearerAuth()
@UsePipes(ZodValidationPipe)
@UseGuards(AuthGuard)
@ApiStandardErrorResponses()
export class DockerRegistryCredentialsController {
  constructor(private readonly service: DockerHostManagementService) {}

  @Get()
  async list(
    @Req() req: express.Request,
  ): Promise<DockerRegistryCredentialListResponse> {
    assertAdmin(req)
    const creds = await this.service.listRegistryCredentials()
    return { result: creds.map(transformDockerRegistryCredentialToDTO) }
  }

  @Post()
  async create(
    @Req() req: express.Request,
    @Body() input: DockerRegistryCredentialInputDTO,
  ): Promise<DockerRegistryCredentialResponse> {
    assertAdmin(req)
    return {
      result: transformDockerRegistryCredentialToDTO(
        await this.service.createRegistryCredential(input),
      ),
    }
  }

  @Put('/:id')
  async update(
    @Req() req: express.Request,
    @Param('id') id: string,
    @Body() input: DockerRegistryCredentialUpdateDTO,
  ): Promise<DockerRegistryCredentialResponse> {
    assertAdmin(req)
    return {
      result: transformDockerRegistryCredentialToDTO(
        await this.service.updateRegistryCredential(id, input),
      ),
    }
  }

  @Delete('/:id')
  async delete(
    @Req() req: express.Request,
    @Param('id') id: string,
  ): Promise<DockerRegistryCredentialDeleteResponse> {
    assertAdmin(req)
    await this.service.deleteRegistryCredential(id)
    return { success: true }
  }
}

// ─── Profile Resource Assignments ──────────────────────────────────────────

@Controller('/api/v1/docker/profile-assignments')
@ApiTags('DockerHostManagement')
@ApiBearerAuth()
@UsePipes(ZodValidationPipe)
@UseGuards(AuthGuard)
@ApiStandardErrorResponses()
export class DockerProfileAssignmentsController {
  constructor(private readonly service: DockerHostManagementService) {}

  @Get()
  async list(
    @Req() req: express.Request,
    @Query() query: DockerProfileAssignmentListQueryParamsDTO,
  ): Promise<DockerProfileAssignmentListResponse> {
    assertAdmin(req)
    const assignments = await this.service.listProfileAssignments(
      query.appIdentifier,
    )
    return { result: assignments.map(transformDockerProfileAssignmentToDTO) }
  }

  @Get('/resolve/:appIdentifier/:profileKey')
  async resolve(
    @Req() req: express.Request,
    @Param('appIdentifier') appIdentifier: string,
    @Param('profileKey') profileKey: string,
  ): Promise<DockerProfileResolveResponse> {
    assertAdmin(req)
    const resolved = await this.service.resolveProfileConfig(
      appIdentifier,
      profileKey,
    )
    return {
      result: {
        hostId: resolved.hostId,
        hostLabel: resolved.host.label,
        hostEndpoint: resolved.host.host,
        resourceConfig: resolved.resourceConfig,
      },
    }
  }

  @Get('/:id')
  async get(
    @Req() req: express.Request,
    @Param('id') id: string,
  ): Promise<DockerProfileAssignmentResponse> {
    assertAdmin(req)
    const assignment = await this.service.getProfileAssignment(id)
    if (!assignment) {
      throw new UnauthorizedException()
    }
    return { result: transformDockerProfileAssignmentToDTO(assignment) }
  }

  @Post()
  async create(
    @Req() req: express.Request,
    @Body() input: DockerProfileAssignmentInputDTO,
  ): Promise<DockerProfileAssignmentResponse> {
    assertAdmin(req)
    return {
      result: transformDockerProfileAssignmentToDTO(
        await this.service.createProfileAssignment(input),
      ),
    }
  }

  @Put('/:id')
  async update(
    @Req() req: express.Request,
    @Param('id') id: string,
    @Body() input: DockerProfileAssignmentUpdateDTO,
  ): Promise<DockerProfileAssignmentResponse> {
    assertAdmin(req)
    return {
      result: transformDockerProfileAssignmentToDTO(
        await this.service.updateProfileAssignment(id, input),
      ),
    }
  }

  @Delete('/:id')
  async delete(
    @Req() req: express.Request,
    @Param('id') id: string,
  ): Promise<DockerProfileAssignmentDeleteResponse> {
    assertAdmin(req)
    await this.service.deleteProfileAssignment(id)
    return { success: true }
  }
}

// ─── Standalone Containers ─────────────────────────────────────────────────

@Controller('/api/v1/docker/standalone-containers')
@ApiTags('DockerHostManagement')
@ApiBearerAuth()
@UsePipes(ZodValidationPipe)
@UseGuards(AuthGuard)
@ApiStandardErrorResponses()
export class DockerStandaloneContainersController {
  constructor(private readonly service: DockerHostManagementService) {}

  @Get()
  async list(
    @Req() req: express.Request,
    @Query() query: DockerStandaloneContainerListQueryParamsDTO,
  ): Promise<DockerStandaloneContainerListResponse> {
    assertAdmin(req)
    const containers = query.dockerHostId
      ? await this.service.listStandaloneContainersByHost(query.dockerHostId)
      : await this.service.listStandaloneContainers()
    return { result: containers.map(transformDockerStandaloneContainerToDTO) }
  }

  @Get('/:id')
  async get(
    @Req() req: express.Request,
    @Param('id') id: string,
  ): Promise<DockerStandaloneContainerResponse> {
    assertAdmin(req)
    const container = await this.service.getStandaloneContainer(id)
    if (!container) {
      throw new UnauthorizedException()
    }
    return { result: transformDockerStandaloneContainerToDTO(container) }
  }

  @Post()
  async create(
    @Req() req: express.Request,
    @Body() input: DockerStandaloneContainerInputDTO,
  ): Promise<DockerStandaloneContainerResponse> {
    assertAdmin(req)
    return {
      result: transformDockerStandaloneContainerToDTO(
        await this.service.createStandaloneContainer(input),
      ),
    }
  }

  @Put('/:id')
  async update(
    @Req() req: express.Request,
    @Param('id') id: string,
    @Body() input: DockerStandaloneContainerUpdateDTO,
  ): Promise<DockerStandaloneContainerResponse> {
    assertAdmin(req)
    return {
      result: transformDockerStandaloneContainerToDTO(
        await this.service.updateStandaloneContainer(id, input),
      ),
    }
  }

  @Post('/:id/desired-status')
  async setDesiredStatus(
    @Req() req: express.Request,
    @Param('id') id: string,
    @Body() input: DockerStandaloneContainerDesiredStatusDTO,
  ): Promise<DockerStandaloneContainerResponse> {
    assertAdmin(req)
    return {
      result: transformDockerStandaloneContainerToDTO(
        await this.service.setStandaloneContainerDesiredStatus(
          id,
          input.desiredStatus,
        ),
      ),
    }
  }

  @Delete('/:id')
  async delete(
    @Req() req: express.Request,
    @Param('id') id: string,
  ): Promise<DockerStandaloneContainerDeleteResponse> {
    assertAdmin(req)
    await this.service.deleteStandaloneContainer(id)
    return { success: true }
  }
}
