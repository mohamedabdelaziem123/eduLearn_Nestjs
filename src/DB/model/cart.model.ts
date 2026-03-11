import { MongooseModule, Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, HydratedDocument } from 'mongoose';


export type CartDocument = HydratedDocument<Cart>;

@Schema({ timestamps: true })
export class Cart {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  studentId: Types.ObjectId;

  // A simple array of Lesson IDs
  @Prop([{ type: Types.ObjectId, ref: 'Lesson' }])
  lessonIds: Types.ObjectId[];
}

export const CartSchema = SchemaFactory.createForClass(Cart);

export const CartModel = MongooseModule.forFeature([ { name: Cart.name, schema: CartSchema } ]); 