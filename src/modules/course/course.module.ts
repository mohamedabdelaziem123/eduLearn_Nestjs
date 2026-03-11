import { Module } from '@nestjs/common';
import { CourseService } from './course.service';
import { CourseController } from './course.controller';
import { userModel, UserRepository } from 'src/DB';
import { CourseModel } from 'src/DB/model/course.model';
import { CourseRepository } from 'src/DB/repository/course.repository';
import { LessonModel } from 'src/DB/model/lesson.model';
import { LessonRepository } from 'src/DB/repository/lesson.repository';
import { CdnService, S3Service } from 'src/common';

@Module({
  imports: [userModel, CourseModel, LessonModel],
  controllers: [CourseController],
  providers: [CourseService, UserRepository, CourseRepository, LessonRepository, S3Service, CdnService],
})
export class CourseModule { }
