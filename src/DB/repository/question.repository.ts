import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DatabaseRepository } from './database.repository';
import { QuestionDocument } from '../model/question.model';
import { EntityId, IQuestion, toObjectId } from 'src/common';

@Injectable()
export class QuestionRepository extends DatabaseRepository<
  IQuestion,
  QuestionDocument
> {
  constructor(
    @InjectModel('Question') protected readonly model: Model<QuestionDocument>,
  ) {
    super(model);
  }

  /** Create a question, casting string IDs to ObjectId internally */
  async createQuestion(data: {
    title: string;
    type: string;
    difficulty: string;
    options: any[];
    courseId?: EntityId;
    lessonId?: EntityId;
  }): Promise<QuestionDocument> {
    const doc: Record<string, any> = {
      title: data.title,
      type: data.type,
      difficulty: data.difficulty,
      options: data.options,
    };
    if (data.courseId) doc.courseId = toObjectId(data.courseId);
    if (data.lessonId) doc.lessonId = toObjectId(data.lessonId);

    const [question] = await this.create({ data: [doc] });
    if (!question) {
      throw new BadRequestException('Error creating Question document');
    }
    return question;
  }

  /** Find questions filtered by difficulty level, scoped to a course (and optionally a lesson) */
  async findByDifficultyAndScope(
    difficulty: string,
    courseId: EntityId,
    lessonId?: EntityId,
  ): Promise<QuestionDocument[]> {
    const filter: Record<string, any> = {
      courseId: toObjectId(courseId),
      difficulty,
    };
    if (lessonId) {
      filter.lessonId = toObjectId(lessonId);
    }
    return this.model.find(filter);
  }

  /** Find all questions belonging to a specific lesson */
  async findByLesson(
    lessonId: EntityId,
    courseId?: EntityId,
  ): Promise<QuestionDocument[]> {
    const filter: Record<string, any> = {
      lessonId: toObjectId(lessonId),
    };
    if (courseId) filter.courseId = toObjectId(courseId);
    return this.model.find(filter).sort({ createdAt: -1 });
  }

  /** Delete a question by its ID */
  async deleteById(questionId: EntityId): Promise<QuestionDocument | null> {
    return this.model.findByIdAndDelete(toObjectId(questionId));
  }
}
