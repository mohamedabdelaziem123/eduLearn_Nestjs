import { Model } from 'mongoose';
import { DatabaseRepository } from './database.repository';
import {
  CourseDocument as TDocument,
  type Course as TRawDocument,
} from '../model/course.model';
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { EntityId, toObjectId } from 'src/common';

@Injectable()
export class CourseRepository extends DatabaseRepository<
  TRawDocument,
  TDocument
> {
  constructor(
    @InjectModel('Course') protected readonly model: Model<TDocument>,
  ) {
    super(model);
  }

  /** Create a course, casting string IDs to ObjectId internally */
  async createCourse(data: {
    title: string;
    description?: string;
    teacherId: EntityId;
    subjectId: EntityId;
    image: string;
  }): Promise<TDocument> {
    const doc: Record<string, any> = {
      title: data.title,
      description: data.description,
      teacherId: toObjectId(data.teacherId),
      subjectId: toObjectId(data.subjectId),
      image: data.image,
    };
    const [Course] = await this.create({ data: [doc] });
    if (!Course) {
      throw new BadRequestException('error create Course document');
    }
    return Course;
  }

  /** Push a quiz ID into the course's quizzes array */
  async addQuizToCourse(courseId: EntityId, quizId: EntityId): Promise<void> {
    await this.model.findByIdAndUpdate(courseId, {
      $push: { quizzes: toObjectId(quizId) },
    });
  }

  /** Remove a quiz ID from the course's quizzes array */
  async removeQuizFromCourse(
    courseId: EntityId,
    quizId: EntityId,
  ): Promise<void> {
    await this.model.findByIdAndUpdate(courseId, {
      $pull: { quizzes: toObjectId(quizId) },
    });
  }

  /** Push a lesson ID into the course's lessons array */
  async addLessonToCourse(
    courseId: EntityId,
    lessonId: EntityId,
  ): Promise<void> {
    await this.model.findByIdAndUpdate(courseId, {
      $push: { lessons: toObjectId(lessonId) },
    });
  }

  /** Remove a lesson ID from the course's lessons array */
  async removeLessonFromCourse(
    courseId: EntityId,
    lessonId: EntityId,
  ): Promise<void> {
    await this.model.findByIdAndUpdate(courseId, {
      $pull: { lessons: toObjectId(lessonId) },
    });
  }

  /** Find a course that belongs to a specific teacher */
  async findByTeacher(
    courseId: EntityId,
    teacherId: EntityId,
  ): Promise<TDocument | null> {
    return this.model.findOne({
      _id: toObjectId(courseId),
      teacherId: toObjectId(teacherId),
    });
  }

  /** Find courses by subjectId, filtering conditionally by user role */
  async findCoursesBySubject(
    subjectId: EntityId,
    userRole: string, // Avoid hard dependency on RoleEnum if it causes circular deps, or use RoleEnum mapped from 'src/common'
  ): Promise<any[]> {
    const filter: any = { subjectId: toObjectId(subjectId) };

    if (userRole === 'teacher') {
      filter.status = { $in: ['published', 'in_progress'] };
    } else if (userRole === 'student') {
      filter.status = 'published';
    }
    // If Admin, no status filter added

    return this.model.find(filter)
      .populate('teacherId', 'firstName lastName email')
      .populate('subjectId', 'name')
      .sort({ createdAt: -1 })
      .exec();
  }

  /** Update a course, casting any ID fields to ObjectId */
  async updateCourse(
    courseId: EntityId,
    data: {
      title?: string;
      description?: string;
      teacherId?: EntityId;
      subjectId?: EntityId;
      status?: string;
      image?: string;
    },
  ): Promise<TDocument | null> {
    const update: Record<string, any> = { ...data };
    if (data.teacherId) update.teacherId = toObjectId(data.teacherId);
    if (data.subjectId) update.subjectId = toObjectId(data.subjectId);

    return this.findOneAndUpdate({
      filter: { _id: toObjectId(courseId) },
      update,
      options: { new: true },
    });
  }

  /** Find unique teacher IDs for courses in a subject */
  async findTeacherIdsBySubject(subjectId: EntityId): Promise<string[]> {
    const courses = await this.model.find(
      { subjectId: toObjectId(subjectId) },
      { teacherId: 1 },
    );
    return [...new Set(courses.map((c) => String(c.teacherId)))];
  }
}
