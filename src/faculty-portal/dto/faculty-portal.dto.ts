import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';

export class BroadcastNotificationDto {
  @ApiProperty({ example: 'Exam Schedule Update' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ example: 'The midterm exam has been rescheduled to next week.' })
  @IsString()
  @IsNotEmpty()
  message!: string;

  @ApiPropertyOptional({ example: ['cs-2024', 'it-2024'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetGroups?: string[]; // department cohort IDs, empty = all students
}
