import {
  MongooseModule,
  Prop,
  Schema,
  SchemaFactory,
  Virtual,
} from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { generateHash } from 'src/common';
import { GenderEnum, providerEnum, RoleEnum } from 'src/common/enums';
import { IUser } from 'src/common/interfaces/user.interface';
import { OtpDocument } from './otp.model';

@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class User implements IUser {
  @Prop({ type: String, required: true, minLength: 2, maxLength: 25 })
  firstName: string;
  @Prop({ type: String, required: false, minLength: 2, maxLength: 25 })
  lastName: string;

  @Virtual({
    get: function (this: User) {
      return `${this.firstName} ${this.lastName}`;
    },
    set: function (name: string) {
      const [firstName, lastName] = name.trim().split(' ') || [];

      this.set({ firstName, lastName });
    },
  })
  username: string;
  @Prop({ type: String, required: true, unique: true })
  email: string;

  @Prop({
    type: String,
    required: function () {
      return this.provider == providerEnum.system ? true : false;
    },
  })
  password: string;

  @Prop({ type: Date, required: false })
  confirmedAt?: Date;

  @Prop({ type: Date, required: false })
  changeCredentialTime: Date;

  @Prop({ type: String, required: false })
  phone: string;
  @Prop({ type: String, required: false })
  address: string;

  @Prop({ type: String, required: false })
  profileImage: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Lesson' }], default: [] })
  boughtLessons: Types.ObjectId[];

  @Prop({
    type: String,
    enum: providerEnum,
    default: providerEnum.system,
  })
  provider: providerEnum;
  @Prop({ type: String, enum: GenderEnum, default: GenderEnum.male })
  gender: GenderEnum;
  @Prop({
    type: String,
    enum: RoleEnum,
    default: RoleEnum.student,
    required: true,
  })
  role: RoleEnum;

  @Prop({
    type: String,
    required: function (this: User) {
      return this.role === RoleEnum.teacher;
    },
  })
  career?: string;

  @Prop({
    type: Boolean,
    default: false,
    required: function (this: User) {
      return this.role === RoleEnum.student;
    },
  })
  isBlocked: boolean;

  @Virtual({
    options: {
      localField: '_id',
      foreignField: 'createdBy',
      ref: 'Otp',
    },
  })
  otp: OtpDocument[];
}

export const userSchema = SchemaFactory.createForClass(User);

userSchema.pre('save', async function () {
  if (this.isModified('password')) {
    this.password = await generateHash({ plainText: this.password });
  }
});

export const userModel = MongooseModule.forFeature([
  { name: User.name, schema: userSchema },
]);
export type UserDocument = HydratedDocument<User>;
