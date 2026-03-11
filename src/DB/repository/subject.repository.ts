import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DatabaseRepository } from './database.repository';
import { SubjectDocument } from '../model/subject.model';
import { EntityId, ISubject, toObjectId } from 'src/common';

@Injectable()
export class SubjectRepository extends DatabaseRepository<
    ISubject,
    SubjectDocument
> {
    constructor(
        @InjectModel('Subject') protected readonly model: Model<SubjectDocument>,
    ) {
        super(model);
    }

    /** Create a new subject */
    async createSubject(data: Partial<ISubject>): Promise<SubjectDocument> {
        const [subject] = await this.create({ data: [data] });
        if (!subject) {
            throw new BadRequestException('Error creating Subject document');
        }
        return subject;
    }

    /** Push a course ID into the subject's courses array (duplicate-safe) */
    async addCourse(
        subjectId: EntityId,
        courseId: EntityId,
    ): Promise<SubjectDocument | null> {
        return this.model.findByIdAndUpdate(
            toObjectId(subjectId),
            { $addToSet: { courses: toObjectId(courseId) } },
            { new: true },
        );
    }

    /** Remove a course ID from the subject's courses array */
    async removeCourse(
        subjectId: EntityId,
        courseId: EntityId,
    ): Promise<SubjectDocument | null> {
        return this.model.findByIdAndUpdate(
            toObjectId(subjectId),
            { $pull: { courses: toObjectId(courseId) } },
            { new: true },
        );
    }
}
