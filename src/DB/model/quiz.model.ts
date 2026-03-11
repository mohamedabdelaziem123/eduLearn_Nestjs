import { MongooseModule, Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, HydratedDocument } from 'mongoose';
import { IQuiz } from 'src/common';

export type QuizDocument = HydratedDocument<Quiz>;

@Schema({ timestamps: true })
export class Quiz implements IQuiz {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ trim: true })
  description: string;

  @Prop({ type: Number, default: 0 })
  timeLimitMinutes: number;

  @Prop({ type: Number, required: true })
  minimumPassScore: number;

  @Prop({ type: Types.ObjectId, ref: 'Lesson', default: null })
  lessonId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Course', required: true })
  courseId: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Question' }], default: [] })
  questions: Types.ObjectId[];

  @Prop({ type: Boolean, default: false })
  isHidden: boolean;
}

export const QuizSchema = SchemaFactory.createForClass(Quiz);

export const QuizModel = MongooseModule.forFeature([
  { name: Quiz.name, schema: QuizSchema },
]);
