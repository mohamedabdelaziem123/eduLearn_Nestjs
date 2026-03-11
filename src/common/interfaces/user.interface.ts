import { OtpDocument } from 'src/DB';
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

  otp?: OtpDocument[];

  changeCredentialTime?: Date;
  phone?: string;
  address?: string;
  profileImage?: string;
  boughtLessons?: EntityId[] | ILesson[];
  provider: providerEnum;
  gender: GenderEnum;
  role: RoleEnum;
  career?: string;
  isBlocked?: boolean;
}
