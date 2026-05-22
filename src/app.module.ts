import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { UrlsService } from './urls/urls.service.js';
import { UrlsController } from './urls/urls.controller.js';
import { UrlsModule } from './urls/urls.module.js';
import { ConfigModule } from '@nestjs/config';
import { UrlsRepository } from './urls/urls.repository.js';
import { RedisService } from './redis/redis.service';
import { RedisModule } from './redis/redis.module';
import { HealthController } from './health/health.controller';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    UrlsModule,
    RedisModule,
    HealthModule,
  ],
  controllers: [AppController, UrlsController, HealthController],
  providers: [AppService, UrlsService, UrlsRepository, RedisService],
})
export class AppModule {}
