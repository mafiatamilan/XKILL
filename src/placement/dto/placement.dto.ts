import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class GenerateStudyPlanDto {
  @ApiProperty({ description: 'Target role to build the study plan for' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  targetRole: string;

  @ApiPropertyOptional({
    description: 'Company names to focus on',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetCompanies?: string[];

  @ApiPropertyOptional({ description: 'Number of weeks to plan for', default: 4 })
  @IsOptional()
  @IsInt()
  weeks?: number;

  @ApiPropertyOptional({ description: 'Number of hours available per week' })
  @IsOptional()
  @IsInt()
  hoursPerWeek?: number;
}

export class RoadmapTaskDto {
  @ApiProperty() id: string;
  @ApiProperty() day: number;
  @ApiProperty() title: string;
  @ApiProperty() description: string;
  @ApiProperty() taskType: string;
  @ApiPropertyOptional() reference?: string;
  @ApiProperty() isCompleted: boolean;
  @ApiPropertyOptional() completedAt?: string;
}

export class RoadmapWeekDto {
  @ApiProperty() id: string;
  @ApiProperty() weekNumber: number;
  @ApiProperty() title: string;
  @ApiProperty() focus: string;
  @ApiProperty({ type: [RoadmapTaskDto] }) tasks: RoadmapTaskDto[];
}

export class RoadmapDto {
  @ApiProperty({ type: [RoadmapWeekDto] })
  weeks: RoadmapWeekDto[];

  @ApiProperty({ description: 'Overall roadmap completion percentage (0-100)' })
  overallPercent: number;
}

export class WeekTasksDto {
  @ApiProperty() weekNumber: number;
  @ApiProperty() title: string;
  @ApiProperty() focus: string;
  @ApiProperty({ type: [RoadmapTaskDto] }) tasks: RoadmapTaskDto[];
}

export class ProgressDto {
  @ApiProperty() overallPercent: number;
  @ApiProperty() totalTasks: number;
  @ApiProperty() completedTasks: number;
  @ApiProperty({
    type: 'array',
    items: { type: 'object' },
  })
  weeks: Array<{
    weekNumber: number;
    percent: number;
    total: number;
    completed: number;
  }>;
}

export class ReadinessPredictionDto {
  @ApiProperty({ description: 'Base readiness score from 5.2 (0-100)' })
  readinessScore: number;

  @ApiProperty({ enum: ['high', 'medium', 'low'] })
  predictedLevel: string;

  @ApiProperty() monthsToReady: number;

  @ApiProperty() compositeScore: number;

  @ApiProperty({ type: [String] })
  reasons: string[];

  @ApiProperty() predictedAt: string;
}

export class CompanyPrepDto {
  @ApiProperty() id: string;
  @ApiProperty() company: string;
  @ApiProperty() description: string;
  @ApiProperty({ type: [String] }) focusAreas: string[];
  @ApiPropertyOptional() resources?: Record<string, unknown>;
}

export class DailyChallengeDto {
  @ApiProperty() id: string;
  @ApiProperty() date: string;
  @ApiProperty() title: string;
  @ApiProperty() description: string;
  @ApiProperty() taskType: string;
  @ApiPropertyOptional() reference?: string;
}

export class StudyPlanDto {
  @ApiProperty() id: string;
  @ApiProperty() title: string;
  @ApiProperty() plan: Record<string, unknown>;
  @ApiProperty() createdAt: string;
}

export class CompleteTaskDto {
  @ApiProperty() id: string;
  @ApiProperty() day: number;
  @ApiProperty() title: string;
  @ApiProperty() taskType: string;
  @ApiProperty() isCompleted: boolean;
  @ApiPropertyOptional() completedAt?: string;
}
