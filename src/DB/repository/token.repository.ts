import { CreateOptions, Model } from 'mongoose';
import { DatabaseRepository } from './database.repository';
import {
  type Token as TRawDocument,
  TokenDocument as TDocument,
  Token,
} from '../model/token.model';
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { EntityId } from 'src/common';
import { toObjectId } from '../mongoose';


@Injectable()
export class TokenRepository extends DatabaseRepository<
  TRawDocument,
  TDocument
> {
  constructor(
    @InjectModel(Token.name) protected readonly model: Model<TDocument>,
  ) {
    super(model);
  }

  async createToken({
    data,
    options,
  }: {
    data: Omit<Partial<TRawDocument>, 'createdBy'> & { createdBy?: EntityId };
    options?: CreateOptions;
  }): Promise<TDocument> {
    // Safely coerce createdBy to ObjectId using the centralized utility
    const createdBy = toObjectId(data.createdBy!);

    const [token] = await this.create({
      data: [{ createdBy, jwtId: data.jwtId, expiresAt: data.expiresAt }],
      options,
    });

    if (!token) {
      throw new BadRequestException('error failed to revoke the token');
    }
    return token;
  }
}
