import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DatabaseRepository } from './database.repository';
import { QuizSessionDocument } from '../model/quiz-session.model';
import { EntityId } from 'src/common';
import { toObjectId } from '../mongoose';

@Injectable()
export class QuizSessionRepository extends DatabaseRepository<
  any,
  QuizSessionDocument
> {
  constructor(
    @InjectModel('QuizSession')
    protected readonly model: Model<QuizSessionDocument>,
  ) {
    super(model);
  }

  /** Create or replace a quiz session for a student (handles restarts) */
  async upsertSession(
    studentId: EntityId,
    quizId: EntityId,
  ): Promise<QuizSessionDocument> {
    await this.model.deleteMany({
      studentId: toObjectId(studentId),
      quizId: toObjectId(quizId),
    });
    return this.model.create({
      studentId: toObjectId(studentId),
      quizId: toObjectId(quizId),
      startedAt: new Date(),
    });
  }

  /** Find the active session for a student's quiz attempt */
  async findSession(
    studentId: EntityId,
    quizId: EntityId,
  ): Promise<QuizSessionDocument | null> {
    return this.model.findOne({
      studentId: toObjectId(studentId),
      quizId: toObjectId(quizId),
    });
  }

  /** Delete a session by its ID */
  async deleteSessionById(sessionId: EntityId): Promise<void> {
    await this.model.findByIdAndDelete(toObjectId(sessionId));
  }
}
