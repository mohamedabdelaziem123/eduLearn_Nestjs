import { MongooseModule, Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, HydratedDocument } from 'mongoose';
import { CourseStatus, ISubject } from 'src/common';
import { ICourse } from 'src/common/interfaces/course.interface';

export type CourseDocument = HydratedDocument<Course>;

@Schema({ timestamps: true })
export class Course implements ICourse {
  @Prop({ required: true, trim: true, maxlength: 100 })
  title: string;

  @Prop({ trim: true, maxlength: 500 })
  description: string;

  @Prop({ type: String, required: true })
  image: string;

  // Assigned to the Teacher
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  teacherId: Types.ObjectId;

  @Prop({ enum: Object.values(CourseStatus), default: CourseStatus.DRAFT })
  status: CourseStatus;

  @Prop({ type: Types.ObjectId, ref: 'Subject', required: true })
  subjectId: Types.ObjectId | ISubject ;
  // Arrays to hold references to future content.
  // Defaulting to [] means they start at "zero" items.
  @Prop({ type: [{ type: Types.ObjectId, ref: 'Lesson' }], default: [] })
  lessons: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Quiz' }], default: [] })
  quizzes: Types.ObjectId[];
}

export const CourseSchema = SchemaFactory.createForClass(Course);

export const CourseModel = MongooseModule.forFeature([
  { name: Course.name, schema: CourseSchema },
]);
