import { EntityId } from 'src/common/types';

// ═══════════════════════════════════════════════════════════════════════════
// PAGINATED RESULTS (Teacher: getResultsByLesson / getResultsByCourse)
// ═══════════════════════════════════════════════════════════════════════════

export class PaginatedResultStudent {
  _id: EntityId;
  firstName: string;
  lastName: string;
  email: string;
}

export class PaginatedResultQuiz {
  _id: EntityId;
  title: string;
}

export class PaginatedResultItem {
  _id: EntityId;
  score: number;
  totalQuestions: number;
  percentage: number;
  isPassed: boolean;
  attemptNumber: number;
  createdAt: Date;
  student: PaginatedResultStudent;
  quiz: PaginatedResultQuiz;
}

export class QuizResultPaginatedResponse {
  results: PaginatedResultItem[];
  totalCount: number;
  averageScore: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// ATTEMPT DETAIL (Teacher: getAttemptForTeacher / Student: getAttempt)
// ═══════════════════════════════════════════════════════════════════════════

export class QuestionOption {
  _id: EntityId;
  text: string;
  isCorrect: boolean;
}

export class ReviewItem {
  questionId: EntityId;
  questionTitle: string;
  questionType: string;
  options: QuestionOption[];
  studentAnswer: string;
  isCorrect: boolean;
}

export class QuizAttemptDetailResponse {
  _id: EntityId;
  quizId: EntityId;
  quizTitle: string;
  studentId?: EntityId;
  score: number;
  totalQuestions: number;
  percentage: number;
  isPassed: boolean;
  attemptNumber: number;
  review: ReviewItem[];
}

// ═══════════════════════════════════════════════════════════════════════════
// START QUIZ (Student)
// ═══════════════════════════════════════════════════════════════════════════

export class StartQuizOption {
  _id: EntityId;
  text: string;
}

export class StartQuizQuestion {
  _id: EntityId;
  title: string;
  type: string;
  options: StartQuizOption[];
}

export class StartQuizResponse {
  _id: EntityId;
  title: string;
  description: string;
  timeLimitMinutes: number;
  questions: StartQuizQuestion[];
}

// ═══════════════════════════════════════════════════════════════════════════
// SUBMIT QUIZ (Student — raw result document)
// ═══════════════════════════════════════════════════════════════════════════

export class AnswerRecordResponse {
  questionId: EntityId;
  studentAnswer: string;
  isCorrect: boolean;
}

export class QuizResultResponse {
  _id: EntityId;
  studentId: EntityId;
  quizId: EntityId;
  lessonId?: EntityId;
  courseId?: EntityId;
  score: number;
  totalQuestions: number;
  percentage: number;
  isPassed: boolean;
  answers: AnswerRecordResponse[];
  attemptNumber: number;
  createdAt?: Date;
  updatedAt?: Date;
}

// ═══════════════════════════════════════════════════════════════════════════
// MY ATTEMPTS (Student — grouped by course)
// ═══════════════════════════════════════════════════════════════════════════

export class AttemptSummary {
  attemptId: EntityId;
  quizTitle: string;
  lessonTitle: string | null;
  score: number;
  totalQuestions: number;
  percentage: number;
  isPassed: boolean;
  attemptNumber: number;
  createdAt: Date;
}

export class MyAttemptsGroupedResponse {
  courseId: string;
  courseTitle: string;
  attempts: AttemptSummary[];
}

// ═══════════════════════════════════════════════════════════════════════════
// PERFORMANCE (Student)
// ═══════════════════════════════════════════════════════════════════════════

export class LessonPerformanceResponse {
  studentScore: number | null;
  lessonAverageScore: number;
}

export class CoursePerformanceResponse {
  studentTotalCourseScore: number;
  courseAverageScore: number;
}
