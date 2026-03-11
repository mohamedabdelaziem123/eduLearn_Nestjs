import { MongooseModule, Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, HydratedDocument } from 'mongoose';
import { ISubject } from 'src/common';

export type SubjectDocument = HydratedDocument<Subject>;

@Schema({ timestamps: true })
export class Subject implements ISubject {
    @Prop({ required: true, unique: true, trim: true, lowercase: true })
    name: string;

    @Prop({ trim: true })
    description: string;

    @Prop({ type: [{ type: Types.ObjectId, ref: 'Course' }], default: [] })
    courses: Types.ObjectId[];
}

export const SubjectSchema = SchemaFactory.createForClass(Subject);

export const SubjectModel = MongooseModule.forFeature([
    { name: Subject.name, schema: SubjectSchema },
]);
