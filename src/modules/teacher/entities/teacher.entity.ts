import { EntityId } from 'src/common/types';
import { GenderEnum, RoleEnum } from 'src/common/enums';
import { ICourse } from 'src/common';

export class TeacherResponse {
  _id: EntityId;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  
  // Teacher-specific
  degree: string;
  
  // Optional fields
  phone?: string;
  address?: string;
  profileImage?: string;
  
  // Metadata
  gender: GenderEnum;
  role: RoleEnum;
  
  createdAt?: Date;
  updatedAt?: Date;
}

export class TeacherWithCoursesResponse extends TeacherResponse {
  // Assigned courses (can be populated)
  assignedCourses?: ICourse[];
}
