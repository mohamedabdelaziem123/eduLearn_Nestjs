import { Module } from '@nestjs/common';
import { QuizService } from './quiz.service';
import { QuizController } from './quiz.controller';
import {
  QuestionRepository,
  QuizRepository,
  QuizResultRepository,
  QuizSessionRepository,
  CourseRepository,
  LessonRepository,
  LessonModel,
} from 'src/DB';
import { QuestionModel } from 'src/DB/model/question.model';
import { QuizModel } from 'src/DB/model/quiz.model';
import { QuizResultModel } from 'src/DB/model/quiz-result.model';
import { QuizSessionModel } from 'src/DB/model/quiz-session.model';
import { CourseModel } from 'src/DB/model/course.model';

@Module({
  imports: [
    QuestionModel,
    QuizModel,
    QuizResultModel,
    QuizSessionModel,
    CourseModel,
    LessonModel
  ],
  controllers: [QuizController],
  providers: [
    QuizService,
    QuestionRepository,
    QuizRepository,
    QuizResultRepository,
    QuizSessionRepository,
    CourseRepository,
    LessonRepository
  ],
  exports: [QuizService],
})
export class QuizModule { }
