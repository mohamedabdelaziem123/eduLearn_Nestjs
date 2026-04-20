import { Module } from '@nestjs/common';
import { CourseService } from './course.service';
import { CourseController } from './course.controller';
import { CourseModel } from 'src/DB/model/course.model';
import { CourseRepository } from 'src/DB/repository/course.repository';
import { userModel, UserRepository } from 'src/DB';
import { LessonModel } from 'src/DB/model/lesson.model';
import { LessonRepository } from 'src/DB/repository/lesson.repository';
import { CdnService, S3Service } from 'src/common';

@Module({
  imports: [CourseModel, LessonModel, userModel],
  controllers: [CourseController],
  providers: [CourseService, CourseRepository, UserRepository, LessonRepository, S3Service, CdnService ,],
})
export class CourseModule { }
