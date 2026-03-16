import { Module } from '@nestjs/common';
import { QuestionService } from './question.service';
import { QuestionController } from './question.controller';
import { CourseModel, CourseRepository, QuestionModel, QuestionRepository } from 'src/DB';

@Module({
  imports:[ QuestionModel, CourseModel],
  controllers: [QuestionController ],
  providers: [QuestionService , QuestionRepository , CourseRepository],
})
export class QuestionModule {}
