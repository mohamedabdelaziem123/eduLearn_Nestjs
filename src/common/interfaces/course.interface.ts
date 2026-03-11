import { CourseStatus } from '../enums';
import { EntityId } from '../types';
import { ILesson } from './lesson.interface';
import { IQuiz } from './quiz.interface';
import { ISubject } from './subject.interface';

export interface ICourse {
  _id?: EntityId;
  title: string;
  description: string;
  image: string;
  teacherId: EntityId;
  subjectId?: EntityId |ISubject;
  status?: CourseStatus;
  lessons?: EntityId[] | ILesson[];
  quizzes?: EntityId[] | IQuiz[];
  createdAt?: Date;
  updatedAt?: Date;
}
