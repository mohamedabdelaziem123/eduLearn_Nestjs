import { CourseStatus, ISubject, IUser } from 'src/common';
import { EntityId } from 'src/common/types';

export class CreateCourseResponse {
  courseId: EntityId;
  title: string;
  teacherId: EntityId;
  status: string;
}

// The main response entity
export class CourseResponse {
  _id: EntityId;
  title: string;
  description: string;
  image?: string;
  status: CourseStatus;

  // Notice these are now the populated objects, not just ObjectIds!
  teacherId: EntityId | IUser;
  subjectId: EntityId | ISubject;

  // These are still arrays of ObjectIds until we populate them later
  lessons?: EntityId[];
  quizzes?: EntityId[];

  createdAt?: Date;
  updatedAt?: Date;
}

/** Response for GET /course/my-courses — courses the student bought lessons from */
export class StudentCourseResponse {
  _id: EntityId;
  title: string;
  description: string;
  image?: string;
  status: CourseStatus;
  teacherId: EntityId | IUser;
  subjectId: EntityId | ISubject;
  createdAt?: Date;
  updatedAt?: Date;
}
