import { CreateOptions, Model } from 'mongoose';
import { DatabaseRepository } from './database.repository';
import {
  OtpDocument as TDocument,
  type Otp as TRawDocument,
  Otp,
} from '../model/otp.model';
import { BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { EntityId, toObjectId } from 'src/common';

export class OtpRepository extends DatabaseRepository<TRawDocument, TDocument> {
  constructor(
    @InjectModel(Otp.name) protected override readonly model: Model<TDocument>,
  ) {
    super(model);
  }

  async createOtp({
    data,
    options,
  }: {
    data: Array<
      Omit<Partial<TRawDocument>, 'createdBy'> & { createdBy?: EntityId }
    >;
    options?: CreateOptions;
  }): Promise<TDocument> {
    // Safely map createdBy from EntityId -> Types.ObjectId if present
    const formattedData = data.map((item) => {
      const formatted = { ...item } as Record<string, any>;
      if (item.createdBy) formatted.createdBy = toObjectId(item.createdBy);
      return formatted;
    });

    const [Otp] = await this.create({
      data: formattedData as Array<Partial<TRawDocument>>,
      options,
    });
    if (!Otp) {
      throw new BadRequestException('error create Otp document');
    }
    return Otp;
  }
}
