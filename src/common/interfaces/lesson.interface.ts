import { EntityId } from '../types';

export interface ILesson {
  _id?: EntityId;
  title: string;
  description?: string;
  courseId: EntityId;

  // MANDATORY VIDEO
  videoUrl: string;
  videoFileId?: string; // For S3 cleanup
  quizId?: EntityId;
  // SALES INFO
  price: number;
  isFree: boolean;
  isHidden: boolean;
  order: number;
}
