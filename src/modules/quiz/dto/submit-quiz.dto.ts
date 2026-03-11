import {
  IsArray,
  ValidateNested,
  IsMongoId,
  IsString,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

class AnswerDto {
  @IsMongoId()
  questionId: string;

  @IsString()
  @IsNotEmpty()
  selectedAnswer: string;
}

export class SubmitQuizDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  answers: AnswerDto[];
}
