import { IsMongoId, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSubjectDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    name: string;

    @IsString()
    @IsOptional()
    @MaxLength(200)
    description?: string;
}

export class UpdateSubjectDto {
    @IsString()
    @IsOptional()
    @MaxLength(50)
    name?: string;

    @IsString()
    @IsOptional()
    @MaxLength(200)
    description?: string;
}

export class SubjectParamsDto {
    @IsMongoId()
    @IsNotEmpty()
    id: string;
}
