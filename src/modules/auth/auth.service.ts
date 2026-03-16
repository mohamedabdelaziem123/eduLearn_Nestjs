import {
  ConflictException,
  Injectable,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import {
  ConfirmEmailOtpBodyDto,
  resetforgotpasswordDto,
  sendConfirmEmailOtpBodyDto,
  SendforgotpasswordDto,
  SignupBodyDto,
  signupWithGmailDto,
  VerfiyforgotpasswordDto,
} from './dto/auth.dto';
import { compareHash, generateHash, IResponse, RedisService } from 'src/common';
import { UserDocument } from 'src/DB/model';
import { logoutEnum, otpEnum, providerEnum } from 'src/common/enums';
import { UserRepository } from 'src/DB';
import { LoginBodyDto } from './dto/auth.dto';
import { LoginResponse } from './entities/auth.entity';
import { TokenService } from 'src/common/services/token.service';
import { OAuth2Client, TokenPayload } from 'google-auth-library';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private UserRepository: UserRepository,
    private tokenService: TokenService,
    private readonly redisService: RedisService,
    private readonly eventEmitter2: EventEmitter2,
  ) {
  }

  async refresh(refreshToken: string): Promise<IResponse<{ access_token: string }>> {
    try {
      const newAccessToken = await this.tokenService.refreshAccessToken(refreshToken);

      const decoded: any = this.tokenService.decodeJwt({ token: newAccessToken });
      this.logger.log(`Token refreshed successfully for user: ${decoded.sub}`);

      return {
        message: 'Token refreshed successfully',
        data: { access_token: newAccessToken },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error('Token refresh failed', error);
      throw new UnauthorizedException('Failed to refresh token');
    }
  }

  async logout(userId: string, accessToken: string, method: logoutEnum): Promise<IResponse> {
    const decoded: any = this.tokenService.decodeJwt({ token: accessToken });

    if (decoded && decoded.exp && decoded.jti) {
      const currentTimeSeconds = Math.floor(Date.now() / 1000);
      const timeLeft = decoded.exp - currentTimeSeconds;

      if (timeLeft > 0) {
        await this.redisService.setTokenToBlocklist(accessToken, timeLeft);
      }
      await this.tokenService.revokeToken(decoded);
    }

    if (method === logoutEnum.allDevices) {
      await this.UserRepository.updateOne({
        filter: { _id: userId },
        update: { changeCredentialTime: new Date() },
      });
      this.logger.log(`User logged out (all devices): ${userId}`);
      return { message: 'Logged out from all devices successfully' };
    }

    this.logger.log(`User logged out (single device): ${userId}`);
    return { message: 'Logged out successfully' };
  }

  async signup(body: SignupBodyDto): Promise<IResponse> {
    const { username, email, password, address, phone, gender }: SignupBodyDto = body;

    const userExists: UserDocument | null = await this.UserRepository.findOne({
      filter: { email },
    });

    if (userExists) {
      throw new ConflictException('email already exists');
    }

    await this.UserRepository.createUser({
      data: [
        {
          username,
          email,
          password,
          address,
          phone,
          provider: providerEnum.system,
          gender,
        },
      ],
    });

    const otp: string = await this.generateOtp(email, otpEnum.confirmEmail);

    this.eventEmitter2.emit(
      otpEnum.confirmEmail,
      {
        to: email,
        subject: 'confirming your email',
        from: 'Edu Learn',
      },
      { title: 'email confirmation', otp },
    );

    return { message: 'done sign up successfully' };
  }

  async login(body: LoginBodyDto): Promise<IResponse<LoginResponse>> {
    const { email, password } = body;
    const user: UserDocument | null = await this.UserRepository.findOne({
      filter: { email, provider:providerEnum.system },
    });

    if (!user) {
      throw new BadRequestException('Invalid credentials');
    }

    if (user.isBlocked) {
      throw new ForbiddenException('Your account has been blocked');
    }

    if (!(await compareHash({ hash: user.password, plainText: password }))) {
      throw new BadRequestException('Invalid credentials');
    }

    const credentials: { access_token: string; refresh_token: string } =
      await this.tokenService.generateLoginCredentials(user as any);

    return {
      message: 'done login ',
      data: { credentials },
    };
  }

  private async verifyGoogleToken(idToken: string): Promise<TokenPayload> {
    const client = new OAuth2Client();
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.CLIENT_ID as string,
    });
    const payload: TokenPayload | undefined = ticket.getPayload();

    if (!payload?.email_verified) {
      throw new BadRequestException('Google account email is not verified');
    }
    return payload;
  }

  async signupWithGmail(body: signupWithGmailDto): Promise<IResponse<LoginResponse>> {
    const { idToken }: signupWithGmailDto = body;
    let payload: TokenPayload;

    try {
      payload = await this.verifyGoogleToken(idToken);
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired Google token. Please try signing in again.');
    }

    const { family_name, email, given_name, picture } = payload;
    const user: UserDocument | null = await this.UserRepository.findOne({ filter: { email } });

    if (user) {
      if (user.provider == providerEnum.google) {
        return await this.loginWithGmail(body);
      }
      throw new ConflictException('sorry email already exist');
    }

    const newUser = await this.UserRepository.createUser({
      data: [
        {
          firstName: given_name as string,
          email: email as string,
          lastName: family_name as string,
          provider: providerEnum.google,
          profileImage: picture as string,
        },
      ],
    });

    const credentials = await this.tokenService.generateLoginCredentials(newUser as any);
    return { message: 'done sign up successfully', data: { credentials } };
  }

  async loginWithGmail(body: signupWithGmailDto): Promise<IResponse<LoginResponse>> {
    const { idToken }: signupWithGmailDto = body;
    let payload: TokenPayload;

    try {
      payload = await this.verifyGoogleToken(idToken);
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired Google token. Please try logging in again.');
    }
    const { email } = payload;

    const user: UserDocument | null = await this.UserRepository.findOne({
      filter: { email, provider: providerEnum.google },
    });

    if (!user) {
      throw new NotFoundException('sorry email not exist');
    }

    if (user.isBlocked) {
      throw new ForbiddenException('Your account has been blocked');
    }

    const credentials = await this.tokenService.generateLoginCredentials(user as any);
    return { message: 'done login successfully', data: { credentials } };
  }

  async sendforgotpassword(body: SendforgotpasswordDto): Promise<IResponse> {
    const { email }: SendforgotpasswordDto = body;

    const user: UserDocument | null = await this.UserRepository.findOne({
      filter: {
        email,
        provider: providerEnum.system,
        confirmedAt: { $exists: true },
      },
    });

    if (!user) {
      throw new NotFoundException('sorry in-valid email');
    }

    const otp: string = await this.generateOtp(email, otpEnum.forgotpassword);

    this.eventEmitter2.emit(
      otpEnum.forgotpassword,
      {
        to: email,
        subject: 'reseting your password',
        from: 'Edu Learn',
      },
      { title: 'forgot password', otp },
    );

    return { message: 'done otp sent successfully' };
  }

  async verfiyforgotpassword(body: VerfiyforgotpasswordDto): Promise<IResponse> {
    const { email, otp }: VerfiyforgotpasswordDto = body;

    const user: UserDocument | null = await this.UserRepository.findOne({
      filter: { email, confirmedAt: { $exists: true } },
    });

    if (!user) {
      throw new NotFoundException('email not found please enter a valid email');
    }

    const redisKey = `otp:${otpEnum.forgotpassword}:${email}`;
    const hashedOtp = await this.redisService.get(redisKey);

    if (!hashedOtp || !(await compareHash({ plainText: otp, hash: hashedOtp }))) {
      throw new BadRequestException('expired or wrong otp please try again');
    }

    await this.redisService.del(redisKey);
    await this.redisService.setForgotPasswordVerified(email, Number(process.env.FORGOT_PASSWORD_VERIFIED_TTL) || 300);

    return { message: 'done otp verfied successfully' };
  }

  async resetforgotpassword(body: resetforgotpasswordDto): Promise<IResponse> {
    const { email, password }: resetforgotpasswordDto = body;

    const isVerified = await this.redisService.isForgotPasswordVerified(email);
    if (!isVerified) {
      throw new ForbiddenException('Please verify your OTP before resetting your password');
    }

    const user: UserDocument | null = await this.UserRepository.findOne({
      filter: {
        email,
        provider: providerEnum.system,
        confirmedAt: { $exists: true },
      },
    });

    if (!user) {
      throw new NotFoundException('sorry in-valid email or provider');
    }

    await this.UserRepository.updatePassword({ userId: user._id, password });
    await this.redisService.deleteForgotPasswordVerified(email);

    return { message: 'done password reset successfully' };
  }

  async resendForgotPassword(body: sendConfirmEmailOtpBodyDto): Promise<IResponse> {
    const { email } = body;
    const user: UserDocument | null = await this.UserRepository.findOne({
      filter: { email, confirmedAt: { $exists: true } },
    });

    if (!user) {
      throw new NotFoundException('email not found please enter a valid email');
    }

    const redisKey = `otp:${otpEnum.forgotpassword}:${email}`;
    const existingOtp = await this.redisService.get(redisKey);

    if (existingOtp) {
      throw new BadRequestException('you already have a valid otp. Please wait before requesting another.');
    }

    const otp: string = await this.generateOtp(email, otpEnum.forgotpassword);

    this.eventEmitter2.emit(
      otpEnum.forgotpassword,
      {
        to: email,
        subject: 'reseting your password',
        from: 'Edu Learn',
      },
      { title: 'reset password', otp },
    );

    return { message: 'otp sent to your email' };
  }

  private async generateOtp(email: string, type: otpEnum): Promise<string> {
    const code: string = String(Math.floor(100000 + Math.random() * 900000));
    const hashedCode = await generateHash({ plainText: code });
    const redisKey = `otp:${type}:${email}`;

    await this.redisService.set(redisKey, hashedCode, Number(process.env.OTP_TTL_SECONDS) || 120);

    return code;
  }

  async resendConfirmEmail(body: sendConfirmEmailOtpBodyDto): Promise<IResponse> {
    const { email } = body;
    const user: UserDocument | null = await this.UserRepository.findOne({
      filter: { email, confirmedAt: { $exists: false } },
    });

    if (!user) {
      throw new NotFoundException('email not found please enter a valid email or already confirmed');
    }

    const redisKey = `otp:${otpEnum.confirmEmail}:${email}`;
    const existingOtp = await this.redisService.get(redisKey);

    if (existingOtp) {
      throw new BadRequestException('you already have a valid otp. Please wait before requesting another.');
    }

    const otp: string = await this.generateOtp(email, otpEnum.confirmEmail);

    this.eventEmitter2.emit(
      otpEnum.confirmEmail,
      {
        to: email,
        subject: 'confirming your email',
        from: 'Edu Learn',
      },
      { title: 'email confirmation', otp },
    );

    return { message: 'otp sent to your email' };
  }

  async ConfirmEmail(body: ConfirmEmailOtpBodyDto): Promise<IResponse> {
    const { email, code } = body;
    const user: UserDocument | null = await this.UserRepository.findOne({
      filter: { email, confirmedAt: { $exists: false } },
    });

    if (!user) {
      throw new NotFoundException('email not found please enter a valid email or already confirmed');
    }

    const redisKey = `otp:${otpEnum.confirmEmail}:${email}`;
    const hashedOtp = await this.redisService.get(redisKey);

    if (!hashedOtp || !(await compareHash({ plainText: code, hash: hashedOtp }))) {
      throw new BadRequestException('expired or wrong otp please try again');
    }

    await this.redisService.del(redisKey);
    await this.UserRepository.confirmUserEmail({ userId: user._id });

    return { message: 'email confirmed successfully' };
  }
}