import { MongooseModule, Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, HydratedDocument } from 'mongoose';
import { IQuizResult, IAnswerRecord } from 'src/common';

export type QuizResultDocument = HydratedDocument<QuizResult>;

// Sub-schema for individual answers so students can review their mistakes
@Schema({ _id: false })
export class AnswerRecord implements IAnswerRecord {
  @Prop({ type: Types.ObjectId, ref: 'Question', required: true })
  questionId: Types.ObjectId;

  @Prop({ type: String, required: true })
  studentAnswer: string;

  @Prop({ type: Boolean, required: true })
  isCorrect: boolean;
}

export const AnswerRecordSchema = SchemaFactory.createForClass(AnswerRecord);

@Schema({ timestamps: true })
export class QuizResult implements IQuizResult {
  // --- WHO AND WHAT ---
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  studentId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Quiz', required: true })
  quizId: Types.ObjectId;

  // Context: Was this part of a specific lesson or course?
  @Prop({ type: Types.ObjectId, ref: 'Lesson' })
  lessonId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Course' })
  courseId: Types.ObjectId;

  // --- GRADING ---
  @Prop({ type: Number, required: true })
  score: number;

  @Prop({ type: Number, required: true })
  totalQuestions: number;

  @Prop({ type: Number, required: true })
  percentage: number;

  @Prop({ type: Boolean, required: true })
  isPassed: boolean;

  // --- REVIEW DATA ---
  @Prop({ type: [AnswerRecordSchema], required: true })
  answers: AnswerRecord[];

  // --- METADATA ---
  @Prop({ type: Number, default: 1 })
  attemptNumber: number;
}

export const QuizResultSchema = SchemaFactory.createForClass(QuizResult);

export const QuizResultModel = MongooseModule.forFeature([
  { name: QuizResult.name, schema: QuizResultSchema },
]);
