import { Module } from '@nestjs/common';
import { TeacherService } from './teacher.service';
import { TeacherController } from './teacher.controller';
import { CourseModel } from 'src/DB/model/course.model';
import { CourseRepository } from 'src/DB/repository/course.repository';
import { userModel, UserRepository } from 'src/DB';
import { LessonModule } from '../lesson/lesson.module';
import { CdnService } from 'src/common';

@Module({
  imports: [CourseModel, LessonModule, userModel],
  controllers: [TeacherController],
  providers: [TeacherService, CourseRepository, UserRepository, CdnService],
})
export class TeacherModule { }
