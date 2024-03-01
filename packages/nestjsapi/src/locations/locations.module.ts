import { Module } from '@nestjs/common'

import { LocationsService } from './services/locations.service'

@Module({
  controllers: [],
  providers: [LocationsService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class LocationsModule {}
