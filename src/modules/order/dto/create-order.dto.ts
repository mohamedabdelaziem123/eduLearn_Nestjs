import {
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
} from 'class-validator';

import { type EntityId, IOrder } from 'src/common';

export class CreateOrderDto implements Partial<IOrder> {
 
}

export class CreateOrderParamsDto {
  @IsMongoId()
  orderId: EntityId;
}
