import { IsString, IsOptional, IsIn, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export const SEARCH_TYPES = ['problem', 'job', 'mentor', 'student', 'company'] as const;
export type SearchType = (typeof SEARCH_TYPES)[number];

export class SearchQueryDto {
  @ApiProperty({ description: 'Search query string', example: 'typescript' })
  @IsString()
  q: string;

  @ApiPropertyOptional({
    enum: SEARCH_TYPES,
    description: 'Filter by entity type (empty = search all)',
  })
  @IsOptional()
  @IsString()
  @IsIn(SEARCH_TYPES)
  type?: string;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Minimum similarity threshold (0-1)', default: 0.1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  minSimilarity?: number;
}

export class SearchResponseItemDto {
  @ApiProperty() id: string;
  @ApiProperty() type: string;
  @ApiProperty() title: string;
  @ApiProperty() description: string;
  @ApiProperty() similarity: number;
  @ApiProperty() metadata: Record<string, unknown>;
}

export class SearchResponseDto {
  @ApiProperty({ type: [SearchResponseItemDto] })
  data: SearchResponseItemDto[];

  @ApiProperty() query: string;
  @ApiProperty() total: number;
  @ApiProperty() types: Record<string, number>;
}
