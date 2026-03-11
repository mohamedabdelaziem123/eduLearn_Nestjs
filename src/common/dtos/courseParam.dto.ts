import { IsMongoId } from 'class-validator';

export class CourseIdParamDto {
  @IsMongoId()
  courseId: string;
}
