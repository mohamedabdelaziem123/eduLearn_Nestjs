import { EntityId } from 'src/common/types';
import { ICourse, IQuiz } from 'src/common';

export class CreateLessonResponse {
  lessonId: EntityId;
  title: string;
  courseId: EntityId;
  order: number;
}

export class LessonResponse {
  _id: EntityId;
  title: string;
  description: string;
  
  // Course reference (can be populated)
  courseId: EntityId | ICourse;
  
  // Video content
  videoUrl: string;
  videoFileId?: string;
  
  // Quiz reference (can be populated)
  quizId?: EntityId | IQuiz;
  
  // Commerce
  price: number;
  isFree: boolean;
  isHidden: boolean;
  
  // Ordering
  order: number;
  
  createdAt?: Date;
  updatedAt?: Date;
}
