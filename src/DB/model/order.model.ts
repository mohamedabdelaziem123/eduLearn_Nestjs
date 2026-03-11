import { MongooseModule, Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, HydratedDocument } from 'mongoose';
import {  orderStatusEnum } from 'src/common';

export type OrderDocument = HydratedDocument<Order>;


@Schema({ timestamps: true })
export class Order {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  studentId: Types.ObjectId;

  // Immutable snapshot of the purchased lessons
  @Prop([
    {
      lessonId: { type: Types.ObjectId, ref: 'Lesson', required: true },
      courseTitle: { type: String, required: true }, // Context for the receipt
      lessonTitle: { type: String, required: true },
      lessonOrder: { type: Number, required: true },
      price: { type: Number, required: true },
    }
  ])
  lessons: {
    lessonId: Types.ObjectId;
    courseTitle: string;
    lessonTitle: string;
    lessonOrder: number;
    price: number;
  }[];

  @Prop({ required: true })
  totalAmount: number;

  @Prop({ required: true, enum: orderStatusEnum, default: orderStatusEnum.PENDING })
  status: orderStatusEnum;

  @Prop({ required: true, type: String })
  paymentGateway: string;

  @Prop({ type: String, unique: true, sparse: true })
  gatewayOrderId?: string; 
}

export const OrderSchema = SchemaFactory.createForClass(Order);

export const OrderModel = MongooseModule.forFeature([ { name: Order.name, schema: OrderSchema } ]);