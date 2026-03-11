import { EntityId } from '../types';

export interface IAnswerRecord {
  questionId: EntityId;
  studentAnswer: string;
  isCorrect: boolean;
}

export interface IQuizResult {
  _id?: EntityId;
  studentId: EntityId;
  quizId: EntityId;
  lessonId?: EntityId;
  courseId?: EntityId;
  score: number;
  totalQuestions: number;
  percentage: number;
  isPassed: boolean;
  answers: IAnswerRecord[];
  attemptNumber: number;
}
