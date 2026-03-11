import { Global, Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { EmailService, RedisService, TokenService } from 'src/common';
import { otpModel, OtpRepository, userModel } from 'src/DB';
import { tokenModel } from 'src/DB/model/token.model';
import { TokenRepository } from 'src/DB/repository/token.repository';
import { UserRepository } from 'src/DB/repository/user.repository';

@Global()
@Module({
  imports: [userModel, tokenModel, otpModel],
  providers: [
    UserRepository,
    TokenService,
    TokenRepository,
    JwtService,
    RedisService,
    OtpRepository,
    EmailService,
  ],
  exports: [
    UserRepository,
    TokenService,
    TokenRepository,
    JwtService,
    RedisService,
    OtpRepository,
    EmailService,
    otpModel,
    userModel,
    tokenModel,
  ],
})
export class GlobalAuthenticationModule { }
