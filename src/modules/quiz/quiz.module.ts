import { Module } from '@nestjs/common';
import { QuizService } from './quiz.service';
import { QuizController } from './quiz.controller';
import {
  QuestionModel,
  QuizModel,
  QuizResultModel,
  QuizSessionModel,
  CourseModel,
} from 'src/DB/model';
import {
  QuestionRepository,
  QuizRepository,
  QuizResultRepository,
  QuizSessionRepository,
  CourseRepository,
} from 'src/DB/repository';

@Module({
  imports: [
    QuestionModel,
    QuizModel,
    QuizResultModel,
    QuizSessionModel,
    CourseModel,
  ],
  controllers: [QuizController],
  providers: [
    QuizService,
    QuestionRepository,
    QuizRepository,
    QuizResultRepository,
    QuizSessionRepository,
    CourseRepository,
  ],
  exports: [QuizService],
})
export class QuizModule {}
