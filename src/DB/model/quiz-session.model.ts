import { MongooseModule, Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, HydratedDocument } from 'mongoose';

export type QuizSessionDocument = HydratedDocument<QuizSession>;

@Schema({ timestamps: true })
export class QuizSession {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  studentId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Quiz', required: true })
  quizId: Types.ObjectId;

  @Prop({ type: Date, required: true, default: () => new Date() })
  startedAt: Date;
}

export const QuizSessionSchema = SchemaFactory.createForClass(QuizSession);

// Auto-delete sessions after 2 hours (cleanup of stale sessions)
QuizSessionSchema.index({ startedAt: 1 }, { expireAfterSeconds: 7200 });

export const QuizSessionModel = MongooseModule.forFeature([
  { name: QuizSession.name, schema: QuizSessionSchema },
]);
