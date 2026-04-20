import { EntityId } from 'src/common/types';
import { GenderEnum, providerEnum, RoleEnum } from 'src/common/enums';
import { ILesson } from 'src/common';

export class UserResponse {
  _id: EntityId;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  
  // Optional fields
  phone?: string;
  address?: string;
  profileImage?: string;
  confirmedAt?: Date;
  
  // Purchased lessons (can be populated)
  boughtLessons: EntityId[] | ILesson[];
  
  // User metadata
  provider: providerEnum;
  gender: GenderEnum;
  role: RoleEnum;
  
  // Teacher-specific
  degree?: string;
  
  // Student-specific
  isBlocked?: boolean;
  
  createdAt?: Date;
  updatedAt?: Date;
}

export class ProfileResponse {
  profile: UserResponse;
}
