import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination/pagination.dto';

export class ResumeContactDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fullName?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  linkedin?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  github?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  website?: string;
}

export class ResumeExperienceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  role?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  company?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startDate?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endDate?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  highlights?: string[];
}

export class ResumeEducationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  degree?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  institution?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startDate?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endDate?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gpa?: string;
}

export class ResumeProjectDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  link?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  highlights?: string[];
}

export class ResumeCertificationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  issuer?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  year?: string;
}

export class ResumeAtsElementsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  tables?: boolean;
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  images?: boolean;
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  textBoxes?: boolean;
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  columns?: boolean;
}

export class ResumeContentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  contact?: ResumeContactDto;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  summary?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];
  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  experience?: ResumeExperienceDto[];
  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  education?: ResumeEducationDto[];
  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  projects?: ResumeProjectDto[];
  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  certifications?: ResumeCertificationDto[];
  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  atsElements?: ResumeAtsElementsDto;
}

export class CreateResumeDto {
  @ApiProperty({ example: 'SDE Resume 2026' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title!: string;

  @ApiProperty({ description: 'ResumeTemplate id' })
  @IsString()
  @IsNotEmpty()
  templateId!: string;

  @ApiProperty({ type: ResumeContentDto })
  @IsObject()
  content!: ResumeContentDto;
}

export class UpdateResumeDto {
  @ApiPropertyOptional({ example: 'SDE Resume 2026' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title?: string;

  @ApiPropertyOptional({ description: 'ResumeTemplate id' })
  @IsOptional()
  @IsString()
  templateId?: string;

  @ApiPropertyOptional({ type: ResumeContentDto })
  @IsOptional()
  @IsObject()
  content?: ResumeContentDto;
}

export class AtsAnalysisDto {
  @ApiPropertyOptional({
    description: 'Optional job description to score keyword overlap against',
    example: 'We are hiring a backend engineer with strong SQL, Node.js and system design skills.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(6000)
  jobDescription?: string;
}

export class ResumeExportQueryDto {
  @ApiPropertyOptional({
    enum: ['pdf', 'docx'],
    description: 'Export format. Required — `pdf` or `docx`.',
  })
  @IsOptional()
  @IsString()
  format?: string;

  @ApiPropertyOptional({
    description: 'Export a specific historical version by id instead of the current content',
  })
  @IsOptional()
  @IsString()
  versionId?: string;
}

export class ResumeListQueryDto extends PaginationQueryDto {}
