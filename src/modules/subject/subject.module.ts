import { Module } from '@nestjs/common';
import { SubjectService } from './subject.service';
import { SubjectController } from './subject.controller';
import { SubjectRepository, userModel, UserRepository } from 'src/DB';
import { SubjectModel } from 'src/DB/model/subject.model';
import { CourseModel } from 'src/DB/model/course.model';
import { CourseRepository } from 'src/DB/repository/course.repository';
import { CdnService } from 'src/common';

@Module({
    imports: [SubjectModel, CourseModel, userModel],
    controllers: [SubjectController],
    providers: [SubjectService, SubjectRepository, CourseRepository, UserRepository, CdnService],
    exports: [SubjectService, SubjectRepository],
})
export class SubjectModule { }
