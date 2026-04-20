import { EntityId } from 'src/common/types';
import { QuestionType, DifficultyLevel } from 'src/common/enums/question.enum';
import { ICourse, ILesson, IOption } from 'src/common';

export class CreateQuestionResponse {
  questionId: EntityId;
  title: string;
  type: QuestionType;
  difficulty: DifficultyLevel;
}

export class OptionResponse implements IOption {
  text: string;
  isCorrect: boolean;
}

export class QuestionResponse {
  _id: EntityId;
  title: string;
  type: QuestionType;
  difficulty: DifficultyLevel;
  
  // Options for the question
  options: OptionResponse[];
  
  // References (can be populated)
  lessonId?: EntityId | ILesson;
  courseId?: EntityId | ICourse;
  
  createdAt?: Date;
  updatedAt?: Date;
}
