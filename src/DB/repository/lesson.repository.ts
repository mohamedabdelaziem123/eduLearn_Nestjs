import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DatabaseRepository } from './database.repository';
import { LessonDocument } from '../model/lesson.model';
import { EntityId, ILesson } from 'src/common';
import { toObjectId } from '../mongoose'

@Injectable()
export class LessonRepository extends DatabaseRepository<
  ILesson,
  LessonDocument
> {
  constructor(
    @InjectModel('Lesson') protected readonly model: Model<LessonDocument>,
  ) {
    super(model);
  }

  async addQuizToLesson(lessonId: string, quizId: string): Promise<void> {
    await this.model.findByIdAndUpdate(lessonId, { quizId: toObjectId(quizId) });
  }

  /** Clear the quizId field on a lesson */
  async removeQuizFromLesson(lessonId: string): Promise<void> {
    await this.model.findByIdAndUpdate(lessonId, { quizId: null });
  }
  /** Create a lesson, casting string IDs to ObjectId internally */
  async createLesson(data: {
    title: string;
    description?: string;
    price?: number;
    isFree?: boolean;
    order?: number;
    courseId: EntityId;
    videoUrl: string;
    videoFileId: string;
  }): Promise<LessonDocument> {
    const doc: Record<string, any> = {
      title: data.title,
      description: data.description,
      price: data.price,
      isFree: data.isFree,
      order: data.order,
      courseId: toObjectId(data.courseId),
      videoUrl: data.videoUrl,
      videoFileId: data.videoFileId,
    };

    const [Lesson] = await this.create({ data: [doc] });
    if (!Lesson) {
      throw new BadRequestException('Error creating Lesson document');
    }
    return Lesson;
  }

  /** Find all lessons for a course, optionally filtering out hidden ones */
  async findLessonsByCourse(
    courseId: EntityId,
    onlyVisible: boolean = false,
  ): Promise<LessonDocument[]> {
    const filter: Record<string, any> = { courseId: toObjectId(courseId) };
    if (onlyVisible) filter.isHidden = false;

    return this.model.find(filter).sort({ order: 1 });
  }

  /** Toggle the isHidden flag of a lesson */
  async toggleHidden(lessonId: EntityId): Promise<LessonDocument | null> {
    const lesson = await this.model.findById(toObjectId(lessonId));
    if (!lesson) return null;
    lesson.isHidden = !lesson.isHidden;
    return lesson.save();
  }

  /** Find multiple lessons by IDs and populate course title */
  async findByIds(lessonIds: EntityId[]): Promise<LessonDocument[]> {
    return this.model
      .find({ _id: { $in: lessonIds.map(toObjectId) } })
      .populate({ path: 'courseId', select: 'title' })
      .exec();
  }

  /** Delete all lessons belonging to a course */
  async deleteByCourse(courseId: EntityId): Promise<void> {
    await this.model.deleteMany({ courseId: toObjectId(courseId) });
  }

  /** Get distinct courseIds from a list of lesson IDs */
  async findDistinctCourseIds(lessonIds: EntityId[]): Promise<string[]> {
    const objectIds = lessonIds.map(toObjectId);
    const courseIds = await this.model.distinct('courseId', {
      _id: { $in: objectIds },
    });
    return courseIds.map(String);
  }
}
