import { IUser } from './user.interface';
import { EntityId } from '../types';

export interface IToken {
  _id?: EntityId;
  jwtId: string;
  expiresAt: number;
  createdBy: EntityId | IUser;
}
