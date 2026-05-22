import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomInt } from 'node:crypto';
import { Url } from '../../generated/prisma/client.js';
import { RedisService } from '../redis/redis.service.js';
import { CreateShortUrlDto } from './dto/create-short-url.dto.js';
import { UrlsRepository } from './urls.repository.js';

type CachedUrlRecord = {
  id: string;
  originalUrl: string;
  shortCode: string;
  expiresAt: string | null;
};

@Injectable()
export class UrlsService {
  private readonly logger = new Logger(UrlsService.name);
  private readonly alphabet =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  constructor(
    private readonly urlsRepository: UrlsRepository,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  async createShortUrl(dto: CreateShortUrlDto, ipAddress: string) {
    await this.enforceShortenRateLimit(ipAddress);

    if (dto.customAlias) {
      const aliasExists = await this.urlsRepository.existsByShortCode(
        dto.customAlias,
      );

      if (aliasExists) {
        throw new ConflictException('Custom alias already exists');
      }
    }

    const parsedExpiresAt = this.parseExpiryDate(dto.expiresAt);
    const shortCode = dto.customAlias ?? (await this.generateUniqueShortCode());

    const savedUrl = await this.urlsRepository.create({
      originalUrl: dto.originalUrl,
      shortCode,
      customAlias: Boolean(dto.customAlias),
      expiresAt: parsedExpiresAt,
    });

    await this.cacheUrl(savedUrl);

    const baseUrl =
      this.configService.get<string>('BASE_URL') ?? 'http://localhost:3000';

    this.logger.log(`Short URL created for code: ${savedUrl.shortCode}`);

    return {
      shortCode: savedUrl.shortCode,
      shortUrl: `${baseUrl}/r/${savedUrl.shortCode}`,
      originalUrl: savedUrl.originalUrl,
      expiresAt: savedUrl.expiresAt,
      createdAt: savedUrl.createdAt,
    };
  }

  async resolveShortCode(shortCode: string): Promise<Url> {
    const cachedUrl = await this.getCachedUrl(shortCode);

    if (cachedUrl) {
      this.logger.log(`Cache hit for code: ${shortCode}`);
      this.ensureNotExpired(
        cachedUrl.expiresAt ? new Date(cachedUrl.expiresAt) : null,
      );
      return this.mapCachedRecordToUrl(cachedUrl);
    }

    this.logger.log(`Cache miss for code: ${shortCode}`);

    const url = await this.urlsRepository.findByShortCode(shortCode);

    if (!url) {
      throw new NotFoundException('Short URL not found');
    }

    this.ensureNotExpired(url.expiresAt);
    await this.cacheUrl(url);

    return url;
  }

  async registerClick(shortCode: string): Promise<Url> {
    const url = await this.resolveShortCode(shortCode);

    await this.urlsRepository.createClick(url.id);

    this.logger.log(`Click recorded for code: ${shortCode}`);

    return url;
  }

  async getStats(shortCode: string) {
    const url = await this.urlsRepository.findByShortCode(shortCode);

    if (!url) {
      throw new NotFoundException('Short URL not found');
    }

    const totalClicks = await this.urlsRepository.countClicksByUrlId(url.id);
    const clicksPerDay = await this.urlsRepository.getClicksGroupedByDay(
      url.id,
    );

    return {
      shortCode: url.shortCode,
      originalUrl: url.originalUrl,
      totalClicks,
      clicksPerDay,
    };
  }

  private async enforceShortenRateLimit(ipAddress: string): Promise<void> {
    const ttlSeconds = Number(
      this.configService.get<string>('SHORTEN_RATE_LIMIT_TTL_SECONDS') ?? '60',
    );
    const maxRequests = Number(
      this.configService.get<string>('SHORTEN_RATE_LIMIT_MAX_REQUESTS') ?? '10',
    );

    const key = `rate_limit:shorten:${ipAddress}`;
    const result = await this.redisService.increaseRateLimit(
      key,
      ttlSeconds,
      maxRequests,
    );

    if (!result.allowed) {
      throw new HttpException(
        `Too many requests. Try again in ${result.retryAfterSeconds} seconds.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private async getCachedUrl(
    shortCode: string,
  ): Promise<CachedUrlRecord | null> {
    return this.redisService.get<CachedUrlRecord>(
      this.getUrlCacheKey(shortCode),
    );
  }

  private async cacheUrl(url: Url): Promise<void> {
    const ttlSeconds = Number(
      this.configService.get<string>('SHORT_URL_CACHE_TTL_SECONDS') ?? '3600',
    );

    await this.redisService.set(
      this.getUrlCacheKey(url.shortCode),
      {
        id: url.id,
        originalUrl: url.originalUrl,
        shortCode: url.shortCode,
        expiresAt: url.expiresAt ? url.expiresAt.toISOString() : null,
      },
      ttlSeconds,
    );
  }

  private getUrlCacheKey(shortCode: string): string {
    return `short_url:${shortCode}`;
  }

  private ensureNotExpired(expiresAt: Date | null): void {
    if (expiresAt && expiresAt < new Date()) {
      throw new BadRequestException('Short URL has expired');
    }
  }

  private mapCachedRecordToUrl(cached: CachedUrlRecord): Url {
    return {
      id: cached.id,
      originalUrl: cached.originalUrl,
      shortCode: cached.shortCode,
      customAlias: false,
      expiresAt: cached.expiresAt ? new Date(cached.expiresAt) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private parseExpiryDate(expiresAt?: string): Date | undefined {
    if (!expiresAt) {
      return undefined;
    }

    const parsedDate = new Date(expiresAt);

    if (Number.isNaN(parsedDate.getTime())) {
      throw new BadRequestException('Invalid expiresAt value');
    }

    if (parsedDate <= new Date()) {
      throw new BadRequestException('expiresAt must be a future date');
    }

    return parsedDate;
  }

  private async generateUniqueShortCode(length = 6): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt++) {
      let code = '';

      for (let i = 0; i < length; i++) {
        code += this.alphabet[randomInt(0, this.alphabet.length)];
      }

      const exists = await this.urlsRepository.existsByShortCode(code);

      if (!exists) {
        return code;
      }
    }

    throw new BadRequestException('Could not generate a unique short code');
  }
}
