import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage } from 'mongoose';
import { DatabaseRepository } from './database.repository';
import { QuizResultDocument } from '../model/quiz-result.model';
import { EntityId, IQuizResult, toObjectId } from 'src/common';

@Injectable()
export class QuizResultRepository extends DatabaseRepository<
  IQuizResult,
  QuizResultDocument
> {
  constructor(
    @InjectModel('QuizResult')
    protected readonly model: Model<QuizResultDocument>,
  ) {
    super(model);
  }

  /** Create a quiz result, casting string IDs to ObjectId internally */
  async createQuizResult(data: {
    studentId: EntityId;
    quizId: EntityId;
    lessonId?: EntityId;
    courseId?: EntityId;
    score: number;
    totalQuestions: number;
    percentage: number;
    isPassed: boolean;
    answers: Array<{
      questionId: EntityId;
      studentAnswer: string;
      isCorrect: boolean;
    }>;
    attemptNumber: number;
  }): Promise<QuizResultDocument> {
    const doc: Record<string, any> = {
      studentId: toObjectId(data.studentId),
      quizId: toObjectId(data.quizId),
      score: data.score,
      totalQuestions: data.totalQuestions,
      percentage: data.percentage,
      isPassed: data.isPassed,
      answers: data.answers.map((a) => ({
        questionId: toObjectId(a.questionId),
        studentAnswer: a.studentAnswer,
        isCorrect: a.isCorrect,
      })),
      attemptNumber: data.attemptNumber,
    };
    if (data.lessonId) doc.lessonId = toObjectId(data.lessonId);
    if (data.courseId) doc.courseId = toObjectId(data.courseId);

    const [result] = await this.create({ data: [doc] });
    if (!result) {
      throw new BadRequestException('Error creating QuizResult document');
    }
    return result;
  }

  /** Run a raw aggregation pipeline on the QuizResult collection */
  async aggregate(pipeline: PipelineStage[]): Promise<any[]> {
    return this.model.aggregate(pipeline);
  }

  /** Find all results for a lesson, with student info populated */
  async findByLessonWithStudents(
    lessonId: EntityId,
  ): Promise<QuizResultDocument[]> {
    return this.model
      .find({ lessonId: toObjectId(lessonId) })
      .populate('studentId')
      .sort({ createdAt: -1 });
  }

  /** Find all results for a course, with student and quiz info populated */
  async findByCourseWithDetails(
    courseId: EntityId,
  ): Promise<QuizResultDocument[]> {
    return this.model
      .find({ courseId: toObjectId(courseId) })
      .populate('studentId quizId')
      .sort({ createdAt: -1 });
  }

  /** Get the average percentage score for a specific lesson */
  async getAverageByLesson(lessonId: EntityId): Promise<number> {
    const result = await this.model.aggregate([
      { $match: { lessonId: toObjectId(lessonId) } },
      { $group: { _id: null, avg: { $avg: '$percentage' } } },
    ]);
    return Math.round(result[0]?.avg ?? 0);
  }

  /** Get the average percentage score for a specific course */
  async getAverageByCourse(courseId: EntityId): Promise<number> {
    const result = await this.model.aggregate([
      { $match: { courseId: toObjectId(courseId) } },
      { $group: { _id: null, avg: { $avg: '$percentage' } } },
    ]);
    return Math.round(result[0]?.avg ?? 0);
  }

  /** Get a specific student's average percentage for a course */
  async getStudentAverageForCourse(
    studentId: EntityId,
    courseId: EntityId,
  ): Promise<number> {
    const result = await this.model.aggregate([
      {
        $match: {
          studentId: toObjectId(studentId),
          courseId: toObjectId(courseId),
        },
      },
      { $group: { _id: null, avg: { $avg: '$percentage' } } },
    ]);
    return Math.round(result[0]?.avg ?? 0);
  }

  /** Get the student's best attempt (highest percentage) for a lesson */
  async getStudentBestForLesson(
    studentId: EntityId,
    lessonId: EntityId,
  ): Promise<QuizResultDocument | null> {
    return this.model
      .findOne({
        studentId: toObjectId(studentId),
        lessonId: toObjectId(lessonId),
      })
      .sort({ percentage: -1 });
  }

  /** Get all attempts for a student, with quiz, lesson, and course details populated */
  async findStudentAttemptsPopulated(
    studentId: EntityId,
  ): Promise<QuizResultDocument[]> {
    return this.model
      .find({ studentId: toObjectId(studentId) })
      .populate([
        { path: 'quizId', select: 'title lessonId courseId' },
        { path: 'lessonId', select: 'title' },
        { path: 'courseId', select: 'title' },
      ])
      .sort({ createdAt: -1 });
  }

  /** Count how many times a student has attempted a specific quiz */
  async countStudentAttempts(
    studentId: EntityId,
    quizId: EntityId,
  ): Promise<number> {
    return this.model.countDocuments({
      studentId: toObjectId(studentId),
      quizId: toObjectId(quizId),
    });
  }

  /** Delete all results associated with a specific quiz */
  async deleteByQuizId(quizId: EntityId): Promise<void> {
    await this.model.deleteMany({ quizId: toObjectId(quizId) });
  }

  /** Find a student's specific attempt by ID */
  async findStudentAttempt(
    studentId: EntityId,
    attemptId: EntityId,
  ): Promise<QuizResultDocument | null> {
    return this.model.findOne({
      _id: toObjectId(attemptId),
      studentId: toObjectId(studentId),
    });
  }
}
