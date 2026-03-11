import { MongooseModule, Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, HydratedDocument } from 'mongoose';
import { IQuestion, IOption } from 'src/common';
import { QuestionType, DifficultyLevel } from 'src/common/enums/question.enum';

export type QuestionDocument = HydratedDocument<Question>;

@Schema()
export class Option implements IOption {
  @Prop({ required: true })
  text: string;

  @Prop({ required: true })
  isCorrect: boolean;
}

export const OptionSchema = SchemaFactory.createForClass(Option);

@Schema({ timestamps: true })
export class Question implements IQuestion {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({
    type: String,
    enum: Object.values(QuestionType),
    required: true,
  })
  type: QuestionType;

  @Prop({
    type: String,
    enum: Object.values(DifficultyLevel),
    required: true,
  })
  difficulty: DifficultyLevel;

  @Prop({ type: [OptionSchema], required: true })
  options: Option[];

  @Prop({ type: Types.ObjectId, ref: 'Lesson', default: null })
  lessonId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Course', default: null })
  courseId: Types.ObjectId;
}

export const QuestionSchema = SchemaFactory.createForClass(Question);

export const QuestionModel = MongooseModule.forFeature([
  { name: Question.name, schema: QuestionSchema },
]);
