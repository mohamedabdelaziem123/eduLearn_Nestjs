import { PartialType } from '@nestjs/mapped-types';
import { CreateBlankCourseDto } from './create-course.dto';
import { IsMongoId, IsOptional, IsString, MaxLength } from 'class-validator';
import { CourseStatus } from 'src/common';

export class UpdateCourseDto extends PartialType(CreateBlankCourseDto) {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  title?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsMongoId()
  @IsOptional()
  teacherId?: string;

  @IsMongoId()
  @IsOptional()
  subjectId?: string;

  @IsString()
  @IsOptional()
  status?: CourseStatus; // Allows Admin to publish/archive
}
