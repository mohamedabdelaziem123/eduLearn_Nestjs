import { EntityId } from 'src/common/types';
import { ICourse } from 'src/common';

export class CreateSubjectResponse {
  subjectId: EntityId;
  name: string;
}

export class SubjectResponse {
  _id: EntityId;
  name: string;
  description: string;
  
  // Course references (can be populated)
  courses: EntityId[] | ICourse[];
  
  createdAt?: Date;
  updatedAt?: Date;
}
