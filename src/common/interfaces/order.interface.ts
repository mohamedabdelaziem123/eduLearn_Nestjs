import { orderStatusEnum } from "../enums";
import { EntityId } from "../types";

export interface IOrderItem {
  lessonId: EntityId;
  courseTitle: string;
  lessonTitle: string;
  lessonOrder: number;
  price: number;
}

export interface IOrder {
  _id?: EntityId ;
  studentId: EntityId ;
  lessons: IOrderItem[];
  totalAmount: number;
  status: orderStatusEnum;
  paymentGateway: string;
  gatewayOrderId?: string; // Optional because it's set after gateway creation
  createdAt?: Date;
  updatedAt?: Date;
}