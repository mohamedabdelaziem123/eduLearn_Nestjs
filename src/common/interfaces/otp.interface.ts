import { otpEnum } from '../enums';
import { IUser } from './user.interface';
import { EntityId } from '../types';

export interface IOtp {
  _id?: EntityId;
  code: string;
  expiredAt: Date;
  type: otpEnum;
  createdBy: EntityId | IUser;
}
