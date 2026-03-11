import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsInt,
  IsMongoId,
  IsOptional,
  Min,
  Max,
} from 'class-validator';

export class CreateQuizDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  timeLimitMinutes?: number;

  @IsInt()
  @Min(0)
  minimumPassScore: number;

  @IsMongoId()
  @IsOptional()
  lessonId?: string;

  @IsMongoId()
  courseId: string;

  /** Number of questions to pick from EACH difficulty level (EASY, MEDIUM, HARD).
   *  Total quiz questions = questionsPerLevel × 3 */
  @IsInt()
  @Min(1)
  questionsPerLevel: number;
}
