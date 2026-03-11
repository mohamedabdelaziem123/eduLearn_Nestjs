import { EntityId } from '../types';
import { ICourse } from './course.interface';

export interface ICart {
    _id?: EntityId;
    studentId: EntityId;
    lessonIds: ICartLessonPopulated[] | EntityId[];
    createdAt?: Date;
    updatedAt?: Date;
}


export interface ICartLessonPopulated {
    _id: EntityId;
    title: string;
    order: number;
    price: number;
    courseId: ICourse | EntityId;

}

