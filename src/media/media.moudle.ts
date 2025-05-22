import { Module } from '@nestjs/common';
import { MediaGateway } from './media.gateway';
import { MediaService } from './media.service';

@Module({
  providers: [MediaGateway, MediaService],
})
export class MediaModule {}
