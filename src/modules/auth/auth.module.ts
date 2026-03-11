import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { GlobalAuthenticationModule } from '../global-auth/global-authentication.module';

@Module({
   imports: [GlobalAuthenticationModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
