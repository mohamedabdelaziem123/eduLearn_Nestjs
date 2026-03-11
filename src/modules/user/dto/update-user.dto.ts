import {
    IsOptional,
    IsString,
    IsNotEmpty,
    MinLength,
    MaxLength,
} from 'class-validator';

export class UpdateProfileDto {
    @IsString()
    @IsNotEmpty()
    @MinLength(2)
    @MaxLength(25)
    @IsOptional()
    firstName?: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(2)
    @MaxLength(25)
    @IsOptional()
    lastName?: string;

    @IsString()
    @IsNotEmpty()
    @IsOptional()
    phone?: string;

    @IsString()
    @IsNotEmpty()
    @IsOptional()
    address?: string;
}
