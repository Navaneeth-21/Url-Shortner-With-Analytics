import { Body, Controller, Get, Param, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { CreateShortUrlDto } from './dto/create-short-url.dto.js';
import { UrlsService } from './urls.service.js';

@Controller()
export class UrlsController {
  constructor(private readonly urlsService: UrlsService) {}

  @Post('shorten')
  async createShortUrl(
    @Body() dto: CreateShortUrlDto,
    @Req() request: Request,
  ) {
    const ipAddress = request.ip ?? request.socket.remoteAddress ?? 'unknown';

    return this.urlsService.createShortUrl(dto, ipAddress);
  }

  @Get('stats/:code')
  async getStats(@Param('code') code: string) {
    return this.urlsService.getStats(code);
  }

  @Get('r/:code')
  async redirectToOriginalUrl(
    @Param('code') code: string,
    @Res() response: Response,
  ) {
    const url = await this.urlsService.registerClick(code);
    return response.redirect(302, url.originalUrl);
  }
}
