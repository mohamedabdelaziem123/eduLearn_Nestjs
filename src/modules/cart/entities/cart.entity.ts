import { EntityId } from 'src/common/types';
import { IUser, ILesson } from 'src/common';

export class CartResponse {
  _id: EntityId;
  
  // Student reference (can be populated)
  studentId: EntityId | IUser;
  
  // Lesson references (can be populated)
  lessonIds: EntityId[] | ILesson[];
  
  createdAt?: Date;
  updatedAt?: Date;
}

export class AddToCartResponse {
  message: string;
  cartItemsCount: number;
}

export class RemoveFromCartResponse {
  message: string;
  cartItemsCount: number;
}
