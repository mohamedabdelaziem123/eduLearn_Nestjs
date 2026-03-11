import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsNotEmpty,
  IsBoolean,
} from 'class-validator';
import { RoleEnum, orderStatusEnum } from 'src/common';

// ── Existing DTO ──────────────────────────────────────────────────────────

export class CreateTeacherDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  career: string;
}

// ── User query params ─────────────────────────────────────────────────────

export class GetUsersQueryDto {
  @Type(() => Number)
  @IsInt()
  @IsNumber()
  @IsPositive()
  @IsOptional()
  page?: number;

  @Type(() => Number)
  @IsInt()
  @IsNumber()
  @IsPositive()
  @IsOptional()
  size?: number;

  @IsEnum(RoleEnum)
  @IsOptional()
  role?: RoleEnum;

  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  isBlocked?: boolean;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  search?: string;
}

// ── Order query params ────────────────────────────────────────────────────

export class GetOrdersQueryDto {
  @Type(() => Number)
  @IsInt()
  @IsNumber()
  @IsPositive()
  @IsOptional()
  page?: number;

  @Type(() => Number)
  @IsInt()
  @IsNumber()
  @IsPositive()
  @IsOptional()
  size?: number;

  @IsEnum(orderStatusEnum)
  @IsOptional()
  status?: orderStatusEnum;
}
