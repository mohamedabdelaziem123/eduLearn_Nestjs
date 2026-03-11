import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { SubjectRepository, UserRepository } from 'src/DB';
import { SubjectDocument } from 'src/DB/model/subject.model';
import { CourseRepository } from 'src/DB/repository/course.repository';
import { CdnService, CourseStatus, EntityId, RoleEnum, toObjectId } from 'src/common';
import { CreateSubjectDto, UpdateSubjectDto } from './dto/subject.dto';
import { Types } from 'mongoose';


@Injectable()
export class SubjectService {
    constructor(
        private readonly subjectRepository: SubjectRepository,
        private readonly courseRepository: CourseRepository,
        private readonly userRepository: UserRepository,
        private readonly cdnService: CdnService,
    ) { }

    /** Create a new subject (duplicate check by name) */
    async create(data: CreateSubjectDto): Promise<SubjectDocument> {
        const existing = await this.subjectRepository.findOne({
            filter: { name: data.name.toLowerCase() },
        });
        if (existing) {
            throw new ConflictException('Subject already exists');
        }
        return this.subjectRepository.createSubject(data);
    }

    /** Update a subject's name and/or description */
    async update(
        subjectId: EntityId,
        data: UpdateSubjectDto,
    ): Promise<SubjectDocument> {
        if (data.name) {
            const existing = await this.subjectRepository.findOne({
                filter: { name: data.name.toLowerCase(), _id: { $ne: subjectId } },
            });
            if (existing) {
                throw new ConflictException('A subject with that name already exists');
            }
        }

        const subject = await this.subjectRepository.findOneAndUpdate({
            filter: { _id: subjectId },
            update: data,
        });

        if (!subject) {
            throw new NotFoundException('Subject not found');
        }
        return subject;
    }

    /** Delete a subject — only if it has no courses */
    async delete(subjectId: EntityId): Promise<void> {
        const subject = await this.subjectRepository.findOne({
            filter: { _id: subjectId },
        });

        if (!subject) {
            throw new NotFoundException('Subject not found');
        }

        if (subject.courses && subject.courses.length > 0) {
            throw new BadRequestException(
                'Cannot delete a subject that still has courses. Remove all courses first.',
            );
        }

        await this.subjectRepository.deleteOne({ filter: { _id: subjectId } });
    }

    /** List all subjects */
    async findAll() {
        return this.subjectRepository.find({ filter: {} });
    }

    /** Get a subject by ID with populated courses */
    async findById(subjectId: EntityId): Promise<SubjectDocument> {
        const subject = await this.subjectRepository.findOne({
            filter: { _id: subjectId },
            options: {
                populate: [{ path: 'courses', select: 'title description status image' }],
            },
        });

        if (!subject) {
            throw new NotFoundException('Subject not found');
        }
        return subject;
    }

    /** Get all courses belonging to a subject */
    async getCoursesBySubject(subjectId: EntityId, userRole: RoleEnum) {


        const subject = await this.subjectRepository.findOne({
            filter: { _id: subjectId },
        });

        if (!subject) {
            throw new NotFoundException('Subject not found');
        }

        return await this.courseRepository.findCoursesBySubject(subjectId, String(userRole));
    }

    /** Get all teachers who teach courses in a specific subject */
    async getTeachersBySubject(subjectId: EntityId) {
        const subject = await this.subjectRepository.findOne({
            filter: { _id: subjectId },
        });

        if (!subject) {
            throw new NotFoundException('Subject not found');
        }

        // Find all published courses for this subject and extract unique teacher IDs
        const courses = await this.courseRepository.find({
            filter: { subjectId, status: CourseStatus.PUBLISHED },
            projection: 'teacherId',
        });

        const teacherIds = [...new Set(courses.map((c: any) => String(c.teacherId)))];

        if (teacherIds.length === 0) {
            return [];
        }

        const teachers = await this.userRepository.find({
            filter: { _id: { $in: teacherIds } },
            projection: '-password -__v -boughtLessons -changeCredentialTime',
        });

        return teachers.map((t: any) => {
            const obj = t.toJSON ? t.toJSON() : t;
            if (obj.profileImage) {
                obj.profileImage = this.cdnService.getSignedUrl(obj.profileImage);
            }
            return obj;
        });
    }
}
