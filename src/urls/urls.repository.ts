// This file defines the UrlsRepository class, which provides methods for interacting with the URL data in the database using Prisma.
import { Injectable } from '@nestjs/common';
import { Prisma, Url } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class UrlsRepository {
  constructor(private readonly prisma: PrismaService) {}

  //   to create a new URL record in the database
  async create(data: Prisma.UrlCreateInput): Promise<Url> {
    return this.prisma.url.create({ data });
  }

  //   to find a URL by its short code
  async findByShortCode(shortCode: string): Promise<Url | null> {
    return this.prisma.url.findUnique({
      where: { shortCode },
    });
  }

  //   to check if a short code already exists in the database for custom alias validation
  async existsByShortCode(shortCode: string): Promise<boolean> {
    const url = await this.prisma.url.findUnique({
      where: { shortCode },
      select: { id: true },
    });

    return Boolean(url);
  }

  // to log a click event for a given URL ID, which can be used for analytics and tracking purposes
  async createClick(urlId: string) {
    return this.prisma.click.create({
      data: {
        url: {
          connect: { id: urlId },
        },
      },
    });
  }

  // to count the number of clicks for a specific URL ID, which can be useful for analytics and reporting on the popularity of shortened URLs
  async countClicksByUrlId(urlId: string): Promise<number> {
    return this.prisma.click.count({
      where: { urlId },
    });
  }

  // to retrieve the number of clicks for a specific URL ID, grouped by day, which can provide insights into the usage patterns and trends of the shortened URLs over time
  async getClicksGroupedByDay(urlId: string) {
    const rows = await this.prisma.$queryRaw<{ date: string; count: bigint }[]>`
      SELECT
        DATE(clicked_at)::text AS date,
        COUNT(*)::bigint AS count
      FROM clicks
      WHERE url_id = ${urlId}
      GROUP BY DATE(clicked_at)
      ORDER BY DATE(clicked_at) ASC
    `;

    return rows.map((row) => ({
      date: row.date,
      count: Number(row.count),
    }));
  }
}
