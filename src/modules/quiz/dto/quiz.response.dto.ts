import { EntityId } from 'src/common/types';
import { ICourse, ILesson, IQuestion } from 'src/common';

export class CreateQuizResponse {
  quizId: EntityId;
  title: string;
  courseId: EntityId;
  minimumPassScore: number;
}

export class QuizResponse {
  _id: EntityId;
  title: string;
  description: string;
  
  // Time limit in minutes
  timeLimitMinutes: number;
  
  // Minimum score to pass (percentage)
  minimumPassScore: number;
  
  // References (can be populated)
  lessonId?: EntityId | ILesson;
  courseId: EntityId | ICourse;
  questions: EntityId[] | IQuestion[];
  
  // Visibility
  isHidden: boolean;
  
  createdAt?: Date;
  updatedAt?: Date;
}
