import { GenderEnum, providerEnum, RoleEnum } from '../enums';
import { EntityId } from '../types';
import { ILesson } from './lesson.interface';

export interface IUser {
  _id?: EntityId;
  firstName: string;
  lastName: string;
  email: string;

  confirmedAt?: Date;
  username?: string;

  password?: string;

  changeCredentialTime?: Date;
  phone?: string;
  address?: string;
  profileImage?: string;
  boughtLessons?: EntityId[] | ILesson[];
  provider: providerEnum;
  gender: GenderEnum;
  role: RoleEnum;
  degree?: string;
  isBlocked?: boolean;
}
