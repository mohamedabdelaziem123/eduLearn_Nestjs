import { QuestionType, DifficultyLevel } from '../enums';
import { EntityId } from '../types';

export interface IOption {
  text: string;
  isCorrect: boolean;
}

export interface IQuestion {
  _id?: EntityId;
  title: string;
  type: QuestionType;
  difficulty: DifficultyLevel;
  options: IOption[];
  lessonId?: EntityId;
  courseId?: EntityId;
}
