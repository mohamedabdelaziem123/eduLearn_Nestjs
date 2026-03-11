import { MongooseModule, Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { IToken } from 'src/common/interfaces/token.interface';

@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Token implements IToken {
  @Prop({ type: String, required: true, index: true })
  jwtId: string;
  @Prop({ type: Number, required: true })
  expiresAt: number;
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  createdBy: Types.ObjectId;
}

export const tokenSchema = SchemaFactory.createForClass(Token);

// TTL index: automatically delete documents when expiresAt is reached
tokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound index for efficient queries by JWT ID and user
tokenSchema.index({ jwtId: 1, createdBy: 1 });

export const tokenModel = MongooseModule.forFeature([
  { name: Token.name, schema: tokenSchema },
]);

export type TokenDocument = HydratedDocument<Token>;
