import { Module } from '@nestjs/common';
import { LessonService } from './lesson.service';
import { LessonController } from './lesson.controller';
import { LessonModel, LessonRepository } from 'src/DB';
import { CourseModel } from 'src/DB/model/course.model';
import { CourseRepository } from 'src/DB/repository/course.repository';
import { CdnService, S3Service } from 'src/common';

@Module({
  imports: [LessonModel, CourseModel],
  controllers: [LessonController],
  providers: [LessonService, LessonRepository, CourseRepository, S3Service, CdnService],
  exports: [LessonService],
})
export class LessonModule {}
