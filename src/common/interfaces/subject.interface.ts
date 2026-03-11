import { EntityId } from '../types';
import { ICourse } from './course.interface';

export interface ISubject {
    _id?: EntityId;
    name: string;
    description?: string;
    courses?: EntityId[] | ICourse[];
    createdAt?: Date;
    updatedAt?: Date;
}
