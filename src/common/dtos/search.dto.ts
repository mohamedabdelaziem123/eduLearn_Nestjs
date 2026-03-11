import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class GetAllDto {
  @Type(() => Number)
  @IsInt()
  @IsNumber()
  @IsPositive()
  @IsOptional()
  page: number | 'all';

  @Type(() => Number)
  @IsInt()
  @IsNumber()
  @IsPositive()
  @IsOptional()
  size: number;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  search: string;
}
