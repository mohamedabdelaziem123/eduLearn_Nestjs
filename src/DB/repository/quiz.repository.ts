import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DatabaseRepository } from './database.repository';
import { QuizDocument } from '../model/quiz.model';
import { EntityId, IQuiz } from 'src/common';
import { toObjectId } from '../mongoose';

@Injectable()
export class QuizRepository extends DatabaseRepository<IQuiz, QuizDocument> {
  constructor(
    @InjectModel('Quiz') protected readonly model: Model<QuizDocument>,
  ) {
    super(model);
  }

  /** Create a quiz, casting string IDs to ObjectId internally */
  async createQuiz(data: {
    title: string;
    description?: string;
    timeLimitMinutes?: number;
    minimumPassScore: number;
    courseId: EntityId;
    lessonId?: EntityId;
    questions: EntityId[];
  }): Promise<QuizDocument> {
    const doc: Record<string, any> = {
      title: data.title,
      description: data.description,
      timeLimitMinutes: data.timeLimitMinutes ?? 0,
      minimumPassScore: data.minimumPassScore,
      courseId: toObjectId(data.courseId),
      questions: data.questions.map((id) => toObjectId(id)),
    };
    if (data.lessonId) doc.lessonId = toObjectId(data.lessonId);

    const [quiz] = await this.create({ data: [doc] });
    if (!quiz) {
      throw new BadRequestException('Error creating Quiz document');
    }
    return quiz;
  }

  /** Find a quiz by ID with all its Question documents populated */
  async findByIdWithQuestions(quizId: EntityId): Promise<QuizDocument | null> {
    return this.model.findById(toObjectId(quizId)).populate('questions');
  }

  /** Find the quiz associated with a specific lesson */
  async findByLessonId(lessonId: EntityId): Promise<QuizDocument | null> {
    return this.model.findOne({ lessonId: toObjectId(lessonId) });
  }

  /** Toggle the isHidden flag and return the updated quiz */
  async toggleHidden(quizId: EntityId): Promise<QuizDocument | null> {
    const quiz = await this.model.findById(toObjectId(quizId));
    if (!quiz) return null;
    quiz.isHidden = !quiz.isHidden;
    return quiz.save();
  }
}
