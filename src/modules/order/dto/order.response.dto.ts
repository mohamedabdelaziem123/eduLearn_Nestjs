import { EntityId } from 'src/common/types';
import { orderStatusEnum } from 'src/common';
import { IUser, ILesson } from 'src/common';

export class LessonSnapshot {
  lessonId: EntityId;
  courseTitle: string;
  lessonTitle: string;
  lessonOrder: number;
  price: number;
}

export class CreateOrderResponse {
  orderId: EntityId;
  totalAmount: number;
  status: orderStatusEnum;
}

export class OrderResponse {
  _id: EntityId;
  
  // Student reference (can be populated)
  studentId: EntityId | IUser;
  
  // Immutable snapshot of purchased lessons
  lessons: LessonSnapshot[];
  
  // Payment details
  totalAmount: number;
  status: orderStatusEnum;
  paymentGateway: string;
  gatewayOrderId?: string;
  
  createdAt?: Date;
  updatedAt?: Date;
}

export class CheckoutSessionResponse {
  sessionURL: string;
}
