export class UrlStatsResponseEntity {
  shortCode: string;
  originalUrl: string;
  totalClicks: number;
  clicksPerDay: {
    date: string;
    count: number;
  }[];
}
