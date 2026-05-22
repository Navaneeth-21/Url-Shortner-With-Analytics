export interface RateLimitResult {
  allowed: boolean;
  currentCount: number;
  remaining: number;
  retryAfterSeconds: number;
}
