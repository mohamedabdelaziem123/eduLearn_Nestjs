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

  /**
   * Paginated quiz results for a lesson — sorted by highest grade,
   * searchable by student name/email.
   */
  async findByLessonPaginated(
    lessonId: EntityId,
    options: { page?: number; size?: number; search?: string },
  ): Promise<{ results: any[]; totalCount: number; averageScore: number }> {
    return this._paginatedResults(
      { lessonId: toObjectId(lessonId) },
      options,
    );
  }

  /**
   * Paginated quiz results for a course — sorted by highest grade,
   * searchable by student name/email.
   */
  async findByCoursePaginated(
    courseId: EntityId,
    options: { page?: number; size?: number; search?: string },
  ): Promise<{ results: any[]; totalCount: number; averageScore: number }> {
    return this._paginatedResults(
      { courseId: toObjectId(courseId) },
      options,
    );
  }

  /**
   * Shared aggregation helper for paginated, searchable, sorted-by-grade results.
   */
  private async _paginatedResults(
    matchFilter: Record<string, any>,
    { page = 1, size = 10, search }: { page?: number; size?: number; search?: string },
  ): Promise<{ results: any[]; totalCount: number; averageScore: number }> {
    const pipeline: PipelineStage[] = [
      { $match: matchFilter },

      // Join student data
      {
        $lookup: {
          from: 'users',
          localField: 'studentId',
          foreignField: '_id',
          as: 'student',
        },
      },
      { $unwind: { path: '$student', preserveNullAndEmptyArrays: true } },

      // Join quiz data
      {
        $lookup: {
          from: 'quizzes',
          localField: 'quizId',
          foreignField: '_id',
          as: 'quiz',
        },
      },
      { $unwind: { path: '$quiz', preserveNullAndEmptyArrays: true } },
    ];

    // Search filter on student name / email
    if (search) {
      const regex = new RegExp(search, 'i');
      pipeline.push({
        $match: {
          $or: [
            { 'student.firstName': regex },
            { 'student.lastName': regex },
            { 'student.email': regex },
          ],
        },
      });
    }

    // Use $facet to get results + metadata in one query
    pipeline.push({
      $facet: {
        metadata: [{ $count: 'totalCount' }],
        avgData: [{ $group: { _id: null, avg: { $avg: '$percentage' } } }],
        results: [
          { $sort: { percentage: -1 } as any },
          { $skip: (Math.max(page, 1) - 1) * size },
          { $limit: size },
          {
            $project: {
              _id: 1,
              score: 1,
              totalQuestions: 1,
              percentage: 1,
              isPassed: 1,
              attemptNumber: 1,
              createdAt: 1,
              student: {
                _id: '$student._id',
                firstName: '$student.firstName',
                lastName: '$student.lastName',
                email: '$student.email',
              },
              quiz: {
                _id: '$quiz._id',
                title: '$quiz.title',
              },
            },
          },
        ],
      },
    });

    const [facetResult] = await this.model.aggregate(pipeline);

    return {
      results: facetResult.results,
      totalCount: facetResult.metadata[0]?.totalCount ?? 0,
      averageScore: Math.round(facetResult.avgData[0]?.avg ?? 0),
    };
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
