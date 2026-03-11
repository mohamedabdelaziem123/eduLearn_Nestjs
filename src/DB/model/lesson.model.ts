import { MongooseModule, Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, HydratedDocument } from 'mongoose';
import { ILesson } from 'src/common';

export type LessonDocument = HydratedDocument<Lesson>;

@Schema({ timestamps: true })
export class Lesson implements ILesson {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ trim: true })
  description: string;

  @Prop({ type: Types.ObjectId, ref: 'Course', required: true })
  courseId: Types.ObjectId;

  // --- CONTENT ---
  @Prop({ type: String, required: true })
  videoUrl: string;

  @Prop({ type: String }) // Optional internal S3 ID
  videoFileId: string;

  @Prop({ type: Types.ObjectId, ref: 'Quiz', default: null })
  quizId: Types.ObjectId;

  // --- COMMERCE ---
  @Prop({ type: Number, required: true, default: 0 })
  price: number;

  @Prop({ type: Boolean, default: false })
  isFree: boolean;

  @Prop({ type: Boolean, default: false })
  isHidden: boolean;

  @Prop({ type: Number, required: true })
  order: number;
}

export const LessonSchema = SchemaFactory.createForClass(Lesson);

export const LessonModel = MongooseModule.forFeature([
  { name: Lesson.name, schema: LessonSchema },
]);
