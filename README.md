# URL Shortener Backend

A clean URL Shortener backend built with NestJS, TypeScript, PostgreSQL, Prisma ORM, and Redis.

## Features

- Create short URLs from long URLs
- Optional custom alias support
- Redirect short URL to original URL
- Optional expiry date for links
- Basic click analytics
- Click count per day
- Redis-based URL caching
- Basic IP-based rate limiting
- Health check endpoint

## Tech Stack

- Node.js
- NestJS
- TypeScript
- PostgreSQL
- Prisma ORM
- Redis

## Project Structure

- `src/urls` - URL shortener feature
- `src/prisma` - Prisma database integration
- `src/redis` - Redis caching and rate limiting
- `src/common` - shared filters & Global Exception handling
- `src/health` - health endpoint

## API Endpoints

### POST `/shorten`
Create a short URL.

Request body:
```json
{
  "originalUrl": "https://example.com",
  "customAlias": "myalias",
  "expiresAt": "2026-05-30T10:00:00.000Z"
}
```
### GET `/r/:code`
Redirect to the original URL.

### GET `/stats/:code`
Get analytics for a short URL.
 - Example response:
```json
{
  "shortCode": "myalias",
  "originalUrl": "https://example.com",
  "totalClicks": 12,
  "clicksPerDay": [
    {
      "date": "2026-05-22",
      "count": 12
    }
  ]
}
```

### GET `/health`
Check if the service is running.

## Setup
 1. Install dependencies:
    ```bash
    npm install
    ```
 2. Configure .env and update the .env.example
 3. Start PostgreSQL and Redis
 4. Generate Prisma client:
    ``` bash
    npx prisma generate
    ```
5. Run migrations:
   ``` bash
    npx prisma migrate dev --name init
   ```
6. Start the server:
   ``` bash
    npm run start:dev
   ```
   
