import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination/pagination.dto';

export class CareerCoachChatDto {
  @ApiProperty({
    description: "The student's message to the AI career coach",
    example: 'Which skills should I focus on for a backend role?',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  message!: string;
}

export class CareerCoachListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'List chats in ascending order (oldest first)' })
  @IsOptional()
  @IsString()
  sort?: string;
}
