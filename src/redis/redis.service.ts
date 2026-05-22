import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type RedisClientType } from 'redis';
import { RateLimitResult } from './interfaces/rate-limit-result.interface';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: RedisClientType;

  constructor(private readonly configService: ConfigService) {
    const redisurl = this.configService.get<string>('REDIS_URL');

    if (!redisurl) {
      throw new Error('REDIS_URL is not set');
    }

    this.client = createClient({
      url: redisurl,
    });

    this.client.on('error', (error) => {
      this.logger.error(
        'Redis error',
        error instanceof Error ? error.stack : error,
      );
    });
  }

  async onModuleInit(): Promise<void> {
    await this.client.connect();
    this.logger.log('Redis Connected');
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
    this.logger.log('Redis Disconnected');
  }

  // Rate Limiting Methods
  async get<T>(key: string): Promise<T | null> {
    const value = await this.client.get(key);

    if (!value) {
      return null;
    }

    return JSON.parse(value) as T;
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const serialized = JSON.stringify(value);

    if (ttlSeconds) {
      await this.client.set(key, serialized, {
        EX: ttlSeconds,
      });
      return;
    }

    await this.client.set(key, serialized);
  }

  async delete(key: string): Promise<void> {
    await this.client.del(key);
  }

  async increaseRateLimit(
    key: string,
    ttlSeconds: number,
    maxRequests: number,
  ): Promise<RateLimitResult> {
    const currentCount = await this.client.incr(key);

    if (currentCount === 1) {
      await this.client.expire(key, ttlSeconds);
    }

    const ttl = await this.client.ttl(key);
    const retryAfterSeconds = ttl > 0 ? ttl : ttlSeconds;
    const allowed = currentCount <= maxRequests;
    const remaining = Math.max(0, maxRequests - currentCount);
    return {
      allowed,
      currentCount,
      remaining,
      retryAfterSeconds,
    };
  }
}
