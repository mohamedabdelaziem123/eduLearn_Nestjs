import { CreateOptions, Model } from 'mongoose';
import { DatabaseRepository } from './database.repository';
import {
  UserDocument as TDocument,
  type User as TRawDocument,
} from '../model/user.model';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { EntityId } from 'src/common';
import { toObjectId } from '../mongoose';

@Injectable()
export class UserRepository extends DatabaseRepository<
  TRawDocument,
  TDocument
> {
  constructor(@InjectModel('User') protected readonly model: Model<TDocument>) {
    super(model);
  }

  async createUser({
    data,
    options,
  }: {
    data: Array<Partial<TRawDocument>>;
    options?: CreateOptions | undefined;
  }): Promise<TDocument> {
    const [user] = await this.create({ data, options });
    if (!user) {
      throw new BadRequestException('error create user document');
    }
    return user;
  }

  /**
   * Update user password — uses findOne + save to trigger the pre('save') hash hook.
   * Also sets changeCredentialTime to invalidate all existing tokens.
   */
  async updatePassword({
    userId,
    password,
  }: {
    userId: EntityId;
    password: string;
  }): Promise<void> {
    const user = await this.findOne({ filter: { _id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    user.password = password;
    user.changeCredentialTime = new Date();
    await user.save();
  }

  /**
   * Confirm a user's email by setting confirmedAt timestamp.
   */
  async confirmUserEmail({
    userId,
  }: {
    userId: EntityId;
  }): Promise<void> {
    await this.updateOne({
      filter: { _id: userId },
      update: { confirmedAt: new Date() },
    });
  }

  /** Push purchased lesson IDs into user's boughtLessons (duplicate-safe) */
  async addBoughtLessons(
    userId: EntityId,
    lessonIds: EntityId[],
  ): Promise<void> {
    await this.model.findByIdAndUpdate(userId, {
      $addToSet: { boughtLessons: { $each: lessonIds.map(toObjectId) } },
    });
  }
}
