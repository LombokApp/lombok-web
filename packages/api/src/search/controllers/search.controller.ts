import { ZodValidationPipe } from '@anatine/zod-nestjs'
import {
  Controller,
  Get,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
  UsePipes,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import express from 'express'
import { AuthGuard } from 'src/auth/guards/auth.guard'
import { normalizeSortParam } from 'src/core/utils/sort.util'
import { ApiStandardErrorResponses } from 'src/shared/decorators/api-standard-error-responses.decorator'

import { SearchQueryParamsDTO } from '../dto/search-query-params.dto'
import { SearchResultsDTO } from '../dto/search-results.dto'
import { SearchService } from '../services/search.service'

@Controller('/api/v1/search')
@ApiTags('Search')
@UseGuards(AuthGuard)
@ApiBearerAuth()
@UsePipes(ZodValidationPipe)
@ApiStandardErrorResponses()
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  /**
   * Perform a search query.
   */
  @Get()
  async search(
    @Req() req: express.Request,
    @Query() queryParams: SearchQueryParamsDTO,
  ): Promise<SearchResultsDTO> {
    if (!req.user) {
      throw new UnauthorizedException()
    }

    // Normalize mediaType to array
    const mediaTypes = queryParams.mediaType
      ? Array.isArray(queryParams.mediaType)
        ? queryParams.mediaType
        : [queryParams.mediaType]
      : undefined

    return this.searchService.listSearchResultsAsUser(req.user, queryParams.q, {
      offset: queryParams.offset,
      limit: queryParams.limit,
      sort: normalizeSortParam(queryParams.sort),
      mediaType: mediaTypes,
    })
  }
}
