import { IsMongoId, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateBlankCourseDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description: string;

  @IsMongoId({ message: 'Invalid Teacher ID format' })
  @IsNotEmpty()
  teacherId: string;

  @IsMongoId({ message: 'Invalid Subject ID format' })
  @IsNotEmpty()
  subjectId: string;
}
