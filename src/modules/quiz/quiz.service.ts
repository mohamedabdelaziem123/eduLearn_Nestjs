import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import {
  QuestionRepository,
  QuizRepository,
  QuizResultRepository,
  QuizSessionRepository,
  CourseRepository,
  LessonRepository,
} from 'src/DB';
import { DifficultyLevel, EntityId } from 'src/common';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { SubmitQuizDto } from './dto/submit-quiz.dto';
import { CreateQuizResponse } from './dto/quiz.response.dto';
import {
  QuizResultPaginatedResponse,
  QuizAttemptDetailResponse,
  StartQuizResponse,
  MyAttemptsGroupedResponse,
  LessonPerformanceResponse,
  CoursePerformanceResponse,
} from './dto/quiz-result.response.dto';

@Injectable()
export class QuizService {


  constructor(
    private readonly questionRepo: QuestionRepository,
    private readonly quizRepo: QuizRepository,
    private readonly quizResultRepo: QuizResultRepository,
    private readonly quizSessionRepo: QuizSessionRepository,
    private readonly courseRepo: CourseRepository,
    private readonly lessonRepo: LessonRepository,
  ) { }

  // ═══════════════════════════════════════════════════════════════════════════
  // TEACHER OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════



  /** Create a quiz — auto-picks equal number of questions from each difficulty level */
  async createQuiz(teacherId: string, dto: CreateQuizDto): Promise<CreateQuizResponse> {
    await this.verifyOwnership(dto.courseId, teacherId);

    // Validate: minimumPassScore cannot exceed total questions
    const totalQuestions = dto.questionsPerLevel * 3;
    if (dto.minimumPassScore > totalQuestions) {
      throw new BadRequestException(
        `minimumPassScore (${dto.minimumPassScore}) cannot exceed total questions (${totalQuestions})`,
      );
    }

    // Pick `questionsPerLevel` random questions from each difficulty level
    const pickedQuestionIds: string[] = [];

    for (const level of [
      DifficultyLevel.EASY,
      DifficultyLevel.MEDIUM,
      DifficultyLevel.HARD,
    ]) {
      const questions = await this.questionRepo.findByDifficultyAndScope(
        level,
        dto.courseId,
        dto.lessonId,
      );

      if (questions.length < dto.questionsPerLevel) {
        throw new BadRequestException(
          `Not enough ${level} questions. Found ${questions.length}, need ${dto.questionsPerLevel}`,
        );
      }

      // Shuffle and pick the required number
      const shuffled = questions.sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, dto.questionsPerLevel);
      pickedQuestionIds.push(...selected.map((q) => q._id.toString()));
    }

    // If this lesson already has a quiz, clean up the old one
    if (dto.lessonId) {
      const lesson = await this.lessonRepo.findOne({ filter: { _id: dto.lessonId } });
      if (lesson?.quizId) {
        const oldQuizId = lesson.quizId.toString();
        // Remove old quiz from course's quizzes array
        await this.courseRepo.removeQuizFromCourse(dto.courseId, oldQuizId);
        // Delete old quiz results
        await this.quizResultRepo.deleteByQuizId(oldQuizId);
        // Delete old quiz document
        await this.quizRepo.deleteOne({ filter: { _id: oldQuizId } });
        // Clear the quizId on the lesson (will be re-set below)
        await this.lessonRepo.removeQuizFromLesson(dto.lessonId);
      }
    }

    const quiz = await this.quizRepo.createQuiz({
      title: dto.title,
      description: dto.description,
      timeLimitMinutes: dto.timeLimitMinutes ?? 0,
      minimumPassScore: dto.minimumPassScore,
      lessonId: dto.lessonId,
      courseId: dto.courseId,
      questions: pickedQuestionIds,
    });

    await this.courseRepo.addQuizToCourse(dto.courseId, quiz._id.toString());
    if (dto.lessonId) await this.lessonRepo.addQuizToLesson(dto.lessonId, quiz._id.toString());

    return {
      quizId: quiz._id,
      title: quiz.title,
      courseId: quiz.courseId,
      minimumPassScore: quiz.minimumPassScore,
    };
  }

  /** Delete a quiz, its results, and remove from Course.quizzes */
  async deleteQuiz(teacherId: string, quizId: string): Promise<void> {
    const quiz = await this.quizRepo.findOne({ filter: { _id: quizId } });
    if (!quiz) throw new NotFoundException('Quiz not found');

    await this.verifyOwnership(quiz.courseId.toString(), teacherId);

    await this.courseRepo.removeQuizFromCourse(
      quiz.courseId.toString(),
      quiz._id.toString(),
    );
    await this.quizResultRepo.deleteByQuizId(quiz._id.toString());
    await this.quizRepo.deleteOne({ filter: { _id: quizId } });
  }

  /** Toggle quiz visibility (hide/unhide) */
  async toggleQuizVisibility(teacherId: string, quizId: string) {
    const quiz = await this.quizRepo.findOne({ filter: { _id: quizId } });
    if (!quiz) throw new NotFoundException('Quiz not found');

    await this.verifyOwnership(quiz.courseId.toString(), teacherId);

    return (await this.quizRepo.toggleHidden(quizId))!;
  }

  /** Teacher: get paginated quiz results for a specific lesson */
  async getResultsByLesson(
    teacherId: string,
    lessonId: string,
    options: { page?: number; size?: number; search?: string } = {},
  ): Promise<QuizResultPaginatedResponse> {
    const quiz = await this.quizRepo.findByLessonId(lessonId);
    if (!quiz) throw new NotFoundException('No quiz found for this lesson');

    await this.verifyOwnership(quiz.courseId.toString(), teacherId);

    return this.quizResultRepo.findByLessonPaginated(lessonId, options);
  }

  /** Teacher: get paginated quiz results for an entire course */
  async getResultsByCourse(
    teacherId: string,
    courseId: string,
    options: { page?: number; size?: number; search?: string } = {},
  ): Promise<QuizResultPaginatedResponse> {
    await this.verifyOwnership(courseId, teacherId);

    return this.quizResultRepo.findByCoursePaginated(courseId, options);
  }

  /** Teacher: view full detail of a student's quiz attempt (questions + correct answers) */
  async getAttemptForTeacher(teacherId: string, attemptId: string): Promise<QuizAttemptDetailResponse> {
    const result = await this.quizResultRepo.findOne({ filter: { _id: attemptId } });
    if (!result) throw new NotFoundException('Quiz attempt not found');

    // Verify the teacher owns the course this attempt belongs to
    await this.verifyOwnership(result.courseId.toString(), teacherId);

    const quiz = (await this.quizRepo.findByIdWithQuestions(
      result.quizId.toString(),
    )) as any;
    if (!quiz) throw new NotFoundException('Quiz not found');

    const reviewData = result.answers.map((answer: any) => {
      const question = quiz.questions.find(
        (q: any) => q._id.toString() === answer.questionId.toString(),
      );
      const questionObj = question?.toObject ? question.toObject() : question;

      return {
        questionId: answer.questionId,
        questionTitle: questionObj?.title ?? 'Deleted Question',
        questionType: questionObj?.type,
        options: questionObj?.options ?? [],
        studentAnswer: answer.studentAnswer,
        isCorrect: answer.isCorrect,
      };
    });

    return {
      _id: result._id,
      quizId: result.quizId,
      quizTitle: quiz.title,
      studentId: result.studentId,
      score: result.score,
      totalQuestions: result.totalQuestions,
      percentage: result.percentage,
      isPassed: result.isPassed,
      attemptNumber: result.attemptNumber,
      review: reviewData,
    };
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // STUDENT OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /** Student: get quiz for taking (strip isCorrect from options!) */
  async startQuiz(studentId: string, quizId: string): Promise<StartQuizResponse> {
    const quiz = (await this.quizRepo.findByIdWithQuestions(quizId)) as any;

    if (!quiz) throw new NotFoundException('Quiz not found');

    if (quiz.isHidden) {
      throw new ForbiddenException('This quiz is currently unavailable');
    }

    // Record the quiz start time for time-limit enforcement
    await this.quizSessionRepo.upsertSession(studentId, quizId);

    // Strip the isCorrect flag from every option so students can't cheat
    const sanitizedQuestions = quiz.questions.map((q: any) => {
      const questionObj = q.toObject ? q.toObject() : q;
      return {
        _id: questionObj._id,
        title: questionObj.title,
        type: questionObj.type,
        options: questionObj.options.map((opt: any) => ({
          _id: opt._id,
          text: opt.text,
        })),
      };
    });

    return {
      _id: quiz._id,
      title: quiz.title,
      description: quiz.description,
      timeLimitMinutes: quiz.timeLimitMinutes,
      questions: sanitizedQuestions,
    };
  }

  /** Student: submit quiz answers and get graded result */
  async submitQuiz(studentId: string, quizId: string, dto: SubmitQuizDto) {
    const quiz = (await this.quizRepo.findByIdWithQuestions(quizId)) as any;
    if (!quiz) throw new NotFoundException('Quiz not found');

    // Check time limit
    if (quiz.timeLimitMinutes > 0) {
      const session = await this.quizSessionRepo.findSession(studentId, quizId);

      if (!session) {
        throw new BadRequestException(
          'No active quiz session found. Please start the quiz first.',
        );
      }

      const elapsedMs = Date.now() - new Date(session.startedAt).getTime();
      const limitMs = quiz.timeLimitMinutes * 60 * 1000;

      if (elapsedMs > limitMs) {
        await this.quizSessionRepo.deleteSessionById(session._id.toString());
        throw new BadRequestException(
          `Time limit exceeded. You had ${quiz.timeLimitMinutes} minutes.`,
        );
      }
    }

    // Grade each answer
    let correctCount = 0;
    const gradedAnswers = dto.answers.map((answer) => {
      const question = quiz.questions.find(
        (q: any) => q._id.toString() === answer.questionId,
      );

      if (!question) {
        throw new BadRequestException(
          `Question ${answer.questionId} not found in this quiz`,
        );
      }

      const questionObj = question.toObject ? question.toObject() : question;
      const correctOption = questionObj.options.find(
        (opt: any) => opt.isCorrect,
      );
      const isCorrect = correctOption?.text === answer.selectedAnswer;

      if (isCorrect) correctCount++;

      return {
        questionId: answer.questionId as any,
        studentAnswer: answer.selectedAnswer,
        isCorrect,
      };
    });

    const totalQuestions = quiz.questions.length;
    const percentage =
      totalQuestions > 0
        ? Math.round((correctCount / totalQuestions) * 100)
        : 0;
    const isPassed = correctCount >= quiz.minimumPassScore;

    const attemptNumber =
      (await this.quizResultRepo.countStudentAttempts(studentId, quizId)) + 1;

    const quizResult = await this.quizResultRepo.createQuizResult({
      studentId: studentId,
      quizId: quizId,
      lessonId: quiz.lessonId ? quiz.lessonId.toString() : undefined,
      courseId: quiz.courseId ? quiz.courseId.toString() : undefined,
      score: correctCount,
      totalQuestions,
      percentage,
      isPassed,
      answers: gradedAnswers,
      attemptNumber,
    });

    return quizResult;
  }

  /** Student: get all their quiz attempts grouped by course */
  async getMyAttempts(studentId: string): Promise<MyAttemptsGroupedResponse[]> {
    const results = (await this.quizResultRepo.findStudentAttemptsPopulated(
      studentId,
    )) as any[];

    const groupedByCourse: Record<string, any> = {};

    for (const result of results) {
      const courseId =
        result.courseId?._id?.toString() ??
        result.courseId?.toString() ??
        'unknown';
      const courseTitle = result.courseId?.title ?? 'Unknown Course';

      if (!groupedByCourse[courseId]) {
        groupedByCourse[courseId] = {
          courseId,
          courseTitle,
          attempts: [],
        };
      }

      groupedByCourse[courseId].attempts.push({
        attemptId: result._id,
        quizTitle: result.quizId?.title ?? 'Unknown Quiz',
        lessonTitle: result.lessonId?.title ?? null,
        lessonId: result.lessonId._id as EntityId,
        score: result.score,
        totalQuestions: result.totalQuestions,
        percentage: result.percentage,
        isPassed: result.isPassed,
        attemptNumber: result.attemptNumber,
        createdAt: result.createdAt,
      });
    }

    return Object.values(groupedByCourse);
  }

  /** Student: view a graded attempt (with correct answers for review) */
  async getAttempt(studentId: string, attemptId: string): Promise<QuizAttemptDetailResponse> {
    const result = await this.quizResultRepo.findStudentAttempt(
      studentId,
      attemptId,
    );
    if (!result) throw new NotFoundException('Quiz attempt not found');

    const quiz = (await this.quizRepo.findByIdWithQuestions(
      result.quizId.toString(),
    )) as any;
    if (!quiz) throw new NotFoundException('Quiz not found');

    const reviewData = result.answers.map((answer: any) => {
      const question = quiz.questions.find(
        (q: any) => q._id.toString() === answer.questionId.toString(),
      );
      const questionObj = question?.toObject ? question.toObject() : question;

      return {
        questionId: answer.questionId,
        questionTitle: questionObj?.title ?? 'Deleted Question',
        questionType: questionObj?.type,
        options: questionObj?.options ?? [],
        studentAnswer: answer.studentAnswer,
        isCorrect: answer.isCorrect,
      };
    });

    return {
      _id: result._id,
      quizId: result.quizId,
      quizTitle: quiz.title,
      score: result.score,
      totalQuestions: result.totalQuestions,
      percentage: result.percentage,
      isPassed: result.isPassed,
      attemptNumber: result.attemptNumber,
      review: reviewData,
    };
  }

  /** Student: get their lesson quiz score compared to the average */
  async getLessonPerformance(studentId: string, lessonId: string): Promise<LessonPerformanceResponse> {
    const bestAttempt = await this.quizResultRepo.getStudentBestForLesson(
      studentId,
      lessonId,
    );
    const studentScore = (bestAttempt as any)?.percentage ?? null;
    const lessonAverageScore =
      await this.quizResultRepo.getAverageByLesson(lessonId);

    return { studentScore, lessonAverageScore };
  }

  /** Student: get their total course score compared to the average */
  async getCoursePerformance(studentId: string, courseId: string): Promise<CoursePerformanceResponse> {
    const studentTotalCourseScore =
      await this.quizResultRepo.getStudentAverageForCourse(studentId, courseId);
    const courseAverageScore =
      await this.quizResultRepo.getAverageByCourse(courseId);

    return { studentTotalCourseScore, courseAverageScore };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  private async verifyOwnership(courseId: string, teacherId: string) {
    const course = await this.courseRepo.findByTeacher(courseId, teacherId);
    if (!course)
      throw new ForbiddenException('Course not found or access denied');
    return course;
  }
}
