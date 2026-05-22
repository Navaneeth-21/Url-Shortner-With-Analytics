import { Module } from '@nestjs/common';
import { UrlsController } from './urls.controller.js';
import { UrlsRepository } from './urls.repository.js';
import { UrlsService } from './urls.service.js';

@Module({
  controllers: [UrlsController],
  providers: [UrlsRepository, UrlsService],
})
export class UrlsModule {}
