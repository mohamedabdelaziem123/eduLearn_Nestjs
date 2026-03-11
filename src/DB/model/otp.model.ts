import { MongooseModule, Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { generateHash } from 'src/common';
import { GenderEnum, otpEnum } from 'src/common/enums';

@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Otp {
  @Prop({ type: String, required: true, default: GenderEnum.male })
  code: string;
  @Prop({ type: Date, required: true })
  expiredAt: Date;
  @Prop({ type: String, enum: otpEnum, required: true })
  type: otpEnum;
  @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
  createdBy: Types.ObjectId;
}

export const otpSchema = SchemaFactory.createForClass(Otp);

otpSchema.pre('save', async function () {
  if (this.isModified('code')) {
    this.code = await generateHash({ plainText: this.code });
  }
});

export const otpModel = MongooseModule.forFeature([
  { name: Otp.name, schema: otpSchema },
]);

otpSchema.index({ expiredAt: 1 }, { expireAfterSeconds: 0 });
export type OtpDocument = HydratedDocument<Otp>;
