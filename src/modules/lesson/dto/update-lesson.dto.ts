import { PartialType } from '@nestjs/mapped-types';
import { CreateLessonDto } from './create-lesson.dto';
import { IsOptional, IsString } from 'class-validator';

export class UpdateLessonDto extends PartialType(CreateLessonDto) {
  // videoKey is optional on update — only present if teacher uploaded a new video
  @IsString()
  @IsOptional()
  videoKey?: string;
}
