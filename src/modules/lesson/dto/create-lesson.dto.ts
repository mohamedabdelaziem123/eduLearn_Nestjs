import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class GetUploadUrlDto {
  @IsString()
  @IsNotEmpty()
  originalname: string;

  @IsString()
  @IsNotEmpty()
  ContentType: string;
}

export class CreateLessonDto {
  @IsString() @IsNotEmpty() title: string;
  @IsString() @IsOptional() description?: string;
  @IsNumber() @IsNotEmpty() price: number;
  @IsBoolean() @IsOptional() isFree?: boolean;
  @IsInt() @IsNotEmpty() order: number;

  @IsString()
  @IsNotEmpty()
  videoKey: string; // the S3 key returned after presigned upload
}
