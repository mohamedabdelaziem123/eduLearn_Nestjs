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
import { compareHash, IResponse, RedisService } from 'src/common';
import { type UserDocument } from 'src/DB/model';
import { logoutEnum, otpEnum, providerEnum } from 'src/common/enums';
import { OtpRepository, UserRepository } from 'src/DB';
import { LoginBodyDto } from './dto/auth.dto';
import { LoginResponse } from './entities/auth.entity';
import { TokenService } from 'src/common/services/token.service';
import { OAuth2Client, type TokenPayload } from 'google-auth-library';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EntityId } from 'src/common/types';

/** TTL in seconds for the forgot-password verification Redis key (5 minutes) */
const FORGOT_PASSWORD_VERIFIED_TTL = 5 * 60;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private UserRepository: UserRepository,
    private tokenService: TokenService,
    private readonly redisService: RedisService,
    private readonly OtpRepository: OtpRepository,
    private readonly eventEmitter2: EventEmitter2,
  ) { }

  /**
   * Refresh access token using refresh token
   * @param refreshToken - The refresh token string
   * @returns New access token
   * @throws UnauthorizedException if refresh token is invalid or expired
   * @throws ForbiddenException if token is revoked or validation fails
   */
  async refresh(
    refreshToken: string,
  ): Promise<IResponse<{ access_token: string }>> {
    try {
      const newAccessToken =
        await this.tokenService.refreshAccessToken(refreshToken);

      // Log successful refresh (extract user ID from token for logging)
      const decoded: any = this.tokenService.decodeJwt({
        token: newAccessToken,
      });
      this.logger.log(`Token refreshed successfully for user: ${decoded.sub}`);

      return {
        message: 'Token refreshed successfully',
        data: { access_token: newAccessToken },
      };
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error('Token refresh failed', error);
      throw new UnauthorizedException('Failed to refresh token');
    }
  }

  /**
   * Logout user — single endpoint for both single-device and all-devices logout.
   * @param userId - The user's ID
   * @param accessToken - The current access token
   * @param method - logoutEnum.oneDevice or logoutEnum.allDevices
   */
  async logout(
    userId: string,
    accessToken: string,
    method: logoutEnum,
  ): Promise<IResponse> {
    // 1. Decode the token to get the expiration time and JWT ID
    const decoded: any = this.tokenService.decodeJwt({ token: accessToken });

    if (decoded && decoded.exp && decoded.jti) {
      // Calculate how many seconds until it naturally expires
      const currentTimeSeconds = Math.floor(Date.now() / 1000);
      const timeLeft = decoded.exp - currentTimeSeconds;

      // 2. Put access token in Redis blocklist ONLY for the remaining time
      if (timeLeft > 0) {
        await this.redisService.setTokenToBlocklist(accessToken, timeLeft);
      }

      // 3. Revoke the refresh token by adding JWT ID to database blocklist
      await this.tokenService.revokeToken(decoded);
    }

    // 4. If all-devices logout, also invalidate every other session
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
    const { username, email, password, address, phone, gender }: SignupBodyDto =
      body;

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

    const User: UserDocument | null = await this.UserRepository.findOne({
      filter: { email },
    });

    const otp: string = await this.generateOtp(
      (User as UserDocument)._id,
      otpEnum.confirmEmail,
    );

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
      filter: { email },
    });

    if (!user) {
      throw new BadRequestException('Invalid credentials');
    }

    if (user.isBlocked) {
      throw new ForbiddenException('Your account has been blocked');
    }

    if (
      !(await compareHash({
        hash: user.password,
        plainText: password,
      }))
    ) {
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

  signupWithGmail = async (
    body: signupWithGmailDto,
  ): Promise<IResponse<LoginResponse>> => {
    const { idToken }: signupWithGmailDto = body;

    let payload: TokenPayload;

    try {
      payload = await this.verifyGoogleToken(idToken);
    } catch (error) {
      throw new UnauthorizedException(
        'Invalid or expired Google token. Please try signing in again.',
      );
    }

    const { family_name, email, given_name, picture } = payload;

    const user: UserDocument | null = await this.UserRepository.findOne({
      filter: { email },
    });

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

    const credentials = await this.tokenService.generateLoginCredentials(
      newUser as any,
    );

    return { message: 'done sign up successfully', data: { credentials } };
  };

  loginWithGmail = async (
    body: signupWithGmailDto,
  ): Promise<IResponse<LoginResponse>> => {
    const { idToken }: signupWithGmailDto = body;
    let payload: TokenPayload;

    try {
      payload = await this.verifyGoogleToken(idToken);
    } catch (error) {
      throw new UnauthorizedException(
        'Invalid or expired Google token. Please try logging in again.',
      );
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

    const credentials = await this.tokenService.generateLoginCredentials(
      user as any,
    );

    return { message: 'done login successfully', data: { credentials } };
  };

  sendforgotpassword = async (
    body: SendforgotpasswordDto,
  ): Promise<IResponse> => {
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

    const otp: string = await this.generateOtp(
      user._id,
      otpEnum.forgotpassword,
    );

    this.eventEmitter2.emit(
      otpEnum.forgotpassword,
      {
        to: email,
        subject: 'reseting your password',
        from: 'MOHAMED ABDELAZIEM',
      },
      { title: 'forgot password', otp },
    );

    return { message: 'done otp sent successfully' };
  };

  verfiyforgotpassword = async (
    body: VerfiyforgotpasswordDto,
  ): Promise<IResponse> => {
    const { email, otp }: VerfiyforgotpasswordDto = body;

    const user: UserDocument | null = await this.UserRepository.findOne({
      filter: { email, confirmedAt: { $exists: true } },
      options: {
        populate: [{ path: 'otp', match: { type: otpEnum.forgotpassword } }],
      },
    });

    if (!user) {
      throw new NotFoundException(
        'email not found please enter a valid email ',
      );
    }

    if (
      !user.otp?.length ||
      !(await compareHash({ plainText: otp, hash: user.otp[0].code }))
    ) {
      throw new BadRequestException('expired or wrong otp please try again ');
    }

    await this.OtpRepository.deleteOne({
      filter: { _id: user.otp[0]._id },
    });

    // Store verification state in Redis with 5-min TTL so resetforgotpassword
    // can confirm the user actually verified the OTP
    await this.redisService.setForgotPasswordVerified(
      email,
      FORGOT_PASSWORD_VERIFIED_TTL,
    );

    return { message: 'done otp verfied successfully' };
  };

  resetforgotpassword = async (
    body: resetforgotpasswordDto,
  ): Promise<IResponse> => {
    const { email, password }: resetforgotpasswordDto = body;

    // Guard: ensure the OTP was verified recently (Redis key exists)
    const isVerified = await this.redisService.isForgotPasswordVerified(email);
    if (!isVerified) {
      throw new ForbiddenException(
        'Please verify your OTP before resetting your password',
      );
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

    // Delegate to repository (triggers pre-save password hash + sets changeCredentialTime)
    await this.UserRepository.updatePassword({
      userId: user._id,
      password,
    });

    // Clean up the Redis verification key
    await this.redisService.deleteForgotPasswordVerified(email);

    return { message: 'done password reset successfully' };
  };

  async resendForgotPassword(
    body: sendConfirmEmailOtpBodyDto,
  ): Promise<IResponse> {
    const { email } = body;
    const user: UserDocument | null = await this.UserRepository.findOne({
      filter: { email, confirmedAt: { $exists: true } },
      options: {
        populate: [{ path: 'otp', match: { type: otpEnum.forgotpassword } }],
      },
    });

    if (!user) {
      throw new NotFoundException(
        'email not found please enter a valid email or already confirmed',
      );
    }

    if (user.otp?.length && user.otp[0].type === otpEnum.forgotpassword) {
      throw new BadRequestException('you already have a valid otp');
    }

    const otp: string = await this.generateOtp(
      (user as any)._id,
      otpEnum.forgotpassword,
    );

    this.eventEmitter2.emit(
      otpEnum.forgotpassword,
      {
        to: email,
        subject: 'reseting your password',
        from: 'MOHAMED ABDELAZIEM',
      },
      { title: 'reset password', otp },
    );
    return { message: 'otp sent to your email' };
  }

  private async generateOtp(userId: EntityId, type: otpEnum): Promise<string> {
    const code: string = String(Math.floor(100000 + Math.random() * 900000));
    await this.OtpRepository.createOtp({
      data: [
        {
          code,
          expiredAt: new Date(Date.now() + 1 * 60 * 1000),
          type,
          createdBy: userId,
        },
      ],
    });
    return code;
  }

  async resendConfirmEmail(
    body: sendConfirmEmailOtpBodyDto,
  ): Promise<IResponse> {
    const { email } = body;
    const user: UserDocument | null = await this.UserRepository.findOne({
      filter: { email, confirmedAt: { $exists: false } },
      options: {
        populate: [{ path: 'otp', match: { type: otpEnum.confirmEmail } }],
      },
    });

    if (!user) {
      throw new NotFoundException(
        'email not found please enter a valid email or already confirmed',
      );
    }

    if (user.otp?.length) {
      throw new NotFoundException('you already have a valid otp');
    }

    const otp: string = await this.generateOtp(
      (user as any)._id,
      otpEnum.confirmEmail,
    );

    this.eventEmitter2.emit(
      otpEnum.confirmEmail,
      {
        to: email,
        subject: 'confirming your email',
        from: 'MOHAMED ABDELAZIEM',
      },
      { title: 'email confirmation', otp },
    );
    return { message: 'otp sent to your email' };
  }

  async ConfirmEmail(body: ConfirmEmailOtpBodyDto): Promise<IResponse> {
    const { email, code } = body;
    const user: UserDocument | null = await this.UserRepository.findOne({
      filter: { email, confirmedAt: { $exists: false } },
      options: {
        populate: [{ path: 'otp', match: { type: otpEnum.confirmEmail } }],
      },
    });

    if (!user) {
      throw new NotFoundException(
        'email not found please enter a valid email or already confirmed',
      );
    }

    if (
      !user.otp?.length ||
      !(await compareHash({ plainText: code, hash: user.otp[0].code }))
    ) {
      throw new BadRequestException('expired or wrong otp please try again ');
    }

    await this.OtpRepository.deleteOne({
      filter: { _id: user.otp[0]._id },
    });

    // Delegate to repository — no Mongoose logic in the service
    await this.UserRepository.confirmUserEmail({ userId: user._id });

    return { message: 'email confirmed successfully' };
  }
}
