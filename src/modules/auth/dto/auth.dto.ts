import {
  IsEmail,
  IsEnum,
  isNotEmpty,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPhoneNumber,
  isString,
  IsString,
  IsStrongPassword,
  length,
  Length,
  Matches,
} from 'class-validator';
import { GenderEnum, IsMatching, logoutEnum } from 'src/common';

export class sendConfirmEmailOtpBodyDto {
  @IsString()
  @IsEmail()
  email: string;
}
export class ConfirmEmailOtpBodyDto extends sendConfirmEmailOtpBodyDto {
  @IsString()
  @Matches(/^\d{6}$/, {
    message: 'Otp must be 6 digit ',
  })
  @IsNotEmpty()
  code: string;
}
export class LoginBodyDto extends sendConfirmEmailOtpBodyDto {
  @IsString()
  @IsStrongPassword()
  password: string;
}

export class SignupBodyDto extends LoginBodyDto {
  @IsString()
  @Length(2, 50, { message: 'name should be between 2 and 50 chars' })
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsMatching('password')
  confirmpassword: string;

  @IsOptional()
  @IsPhoneNumber('EG')
  phone: string;

  @IsOptional()
  address: string;

  @IsEnum(GenderEnum)
  gender: GenderEnum;
}

export class SendforgotpasswordDto {
  @IsString()
  @IsEmail()
  email: string;
}

export class VerfiyforgotpasswordDto extends SendforgotpasswordDto {
  @IsString()
  @Matches(/^\d{6}$/, {
    message: 'Otp must be 6 digit ',
  })
  @IsNotEmpty()
  otp: string;
}

export class resetforgotpasswordDto extends LoginBodyDto {
  @IsString()
  @IsMatching('password')
  confirmpassword: string;
}

export class signupWithGmailDto {
  @IsString()
  @IsNotEmpty()
  idToken: string;
}

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refresh_token: string;
}

export class logoutDto {
  @IsEnum(logoutEnum)
  @IsNotEmpty()
  method: logoutEnum;
}
