import { Global, Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CdnService, EmailService, RedisService, TokenService } from 'src/common';
import { userModel } from 'src/DB';
import { tokenModel } from 'src/DB/model/token.model';
import { TokenRepository } from 'src/DB/repository/token.repository';
import { UserRepository } from 'src/DB/repository/user.repository';

@Global()
@Module({
  imports: [userModel, tokenModel],
  providers: [
    UserRepository,
    TokenService,
    TokenRepository,
    JwtService,
    RedisService,
    EmailService,
  ],
  exports: [
    UserRepository,
    TokenService,
    TokenRepository,
    JwtService,
    RedisService,
    EmailService,
    userModel,
    tokenModel,
  ],
})
export class GlobalAuthenticationModule { }
