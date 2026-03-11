import { EntityId } from '../types';
import { IQuestion } from './question.interface';

export interface IQuiz {
  _id?: EntityId;
  title: string;
  description?: string;
  timeLimitMinutes?: number;
  minimumPassScore: number;
  lessonId?: EntityId;
  courseId: EntityId;
  questions: EntityId[] | IQuestion[];
  isHidden: boolean;
}
