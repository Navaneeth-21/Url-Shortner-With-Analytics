import {
  IsDateString,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateShortUrlDto {
  @IsUrl()
  @MaxLength(2048)
  originalUrl!: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9_-]{4,20}$/, {
    message:
      'customAlias must be 4-20 characters and contain only letters, numbers, hyphen, or underscore',
  })
  customAlias?: string;

  @IsString()
  @IsDateString()
  expiresAt?: string;
}
