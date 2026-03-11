import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { CdnService, S3Service } from 'src/common';
import { AuthModule } from '../auth/auth.module';
import { tokenModel, TokenRepository, userModel, UserRepository } from 'src/DB';
import { JwtService } from '@nestjs/jwt';
import { GlobalAuthenticationModule } from '../global-auth/global-authentication.module';

@Module({
  imports: [userModel],
  controllers: [UserController],
  providers: [UserService, S3Service, CdnService, UserRepository],
})
export class UserModule {
  // configure(consumer: MiddlewareConsumer) {
  //   consumer.apply(preAuthentication).forRoutes(UserController);
  // }
}
