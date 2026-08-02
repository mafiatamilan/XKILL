import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreatePlaylistDto {
  @ApiProperty({ example: 'Graphs deep-dive' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title!: string;

  @ApiPropertyOptional({ example: 'Every graph problem worth solving in order' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Share the list with others (private by default)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class UpdatePlaylistDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class AddPlaylistProblemDto {
  @ApiProperty({ description: 'Problem id to add to the playlist' })
  @IsString()
  @IsNotEmpty()
  problemId!: string;
}

export class CreateDiscussionDto {
  @ApiProperty({ example: 'O(n) two-pointer intuition' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @ApiProperty({ example: 'Start with both pointers at the ends…' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  body!: string;
}

export class UpdateVisibilityDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showFullName?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showEmail?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showCollege?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showSkills?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showSolvedCount?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showTopics?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showStreak?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showRating?: boolean;
}
