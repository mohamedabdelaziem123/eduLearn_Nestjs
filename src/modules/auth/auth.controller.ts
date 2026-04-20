import { Controller, Post, Body, Req, Headers } from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  SignupBodyDto,
  signupWithGmailDto,
  LoginBodyDto,
  RefreshTokenDto,
  sendConfirmEmailOtpBodyDto,
  ConfirmEmailOtpBodyDto,
  SendforgotpasswordDto,
  VerfiyforgotpasswordDto,
  resetforgotpasswordDto,
  logoutDto,
} from './dto/auth.dto';
import { IResponse, successResponse, Auth, User, RoleEnum } from 'src/common';
import { LoginResponse } from './dto/auth.response.dto';



@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('/signup')
  async signup(@Body() body: SignupBodyDto): Promise<IResponse> {
    const Response = await this.authService.signup(body);
    return successResponse(Response);
  }

  @Post('/login')
  async login(@Body() body: LoginBodyDto): Promise<IResponse<LoginResponse>> {
    const Response = await this.authService.login(body);
    return successResponse(Response);
  }

  @Post('/refresh')
  async refresh(
    @Headers('authorization') authorization: string,
  ): Promise<IResponse<{ access_token: string }>> {
    const refreshToken = authorization.split(' ')[1]
    const Response = await this.authService.refresh(refreshToken);
    return successResponse(Response);
  }

  @Post('/logout')
  @Auth([RoleEnum.student , RoleEnum.teacher , RoleEnum.admin])
  async logout(
    @User() { _id }: { _id: string },
    @Headers('authorization') authorization: string,
    @Body() body: logoutDto,
  ): Promise<IResponse> {

    const accessToken = authorization.split(' ')[1];
    const Response = await this.authService.logout(
      _id,
      accessToken,
      body.method,
    );
    return successResponse(Response);
  }

  @Post('/signupWithGmail')
  async signupWithGmail(
    @Body() body: signupWithGmailDto,
  ): Promise<IResponse<LoginResponse>> {
    const Response = await this.authService.signupWithGmail(body);
    return successResponse(Response);
  }

  @Post('/loginWithGmail')
  async loginWithGmail(
    @Body() body: signupWithGmailDto,
  ): Promise<IResponse<LoginResponse>> {
    const Response = await this.authService.loginWithGmail(body);
    return successResponse(Response);
  }

  @Post('/resend-confirm-email')
  async resendConfirmEmail(
    @Body() body: sendConfirmEmailOtpBodyDto,
  ): Promise<IResponse> {
    const Response = await this.authService.resendConfirmEmail(body);
    return successResponse(Response);
  }

  @Post('/resend-forgot-password')
  async resendForgotPassword(
    @Body() body: SendforgotpasswordDto,
  ): Promise<IResponse> {
    const Response = await this.authService.resendForgotPassword(body);
    return successResponse(Response);
  }

  @Post('/confirm-email')
  async ConfirmEmail(@Body() body: ConfirmEmailOtpBodyDto): Promise<IResponse> {
    const Response = await this.authService.ConfirmEmail(body);
    return successResponse(Response);
  }

  @Post('/send-forgot-password')
  async sendforgotpassword(
    @Body() body: SendforgotpasswordDto,
  ): Promise<IResponse> {
    const Response = await this.authService.sendforgotpassword(body);
    return successResponse(Response);
  }
  @Post('/verfiy-forgot-password')
  async verifyforgotpassword(
    @Body() body: VerfiyforgotpasswordDto,
  ): Promise<IResponse> {
    const Response = await this.authService.verfiyforgotpassword(body);
    return successResponse(Response);
  }
  @Post('/reset-forgot-password')
  async resetforgotpassword(
    @Body() body: resetforgotpasswordDto,
  ): Promise<IResponse> {
    const Response = await this.authService.resetforgotpassword(body);
    return successResponse(Response);
  }
}
