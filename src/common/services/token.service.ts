import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService, JwtSignOptions, JwtVerifyOptions } from '@nestjs/jwt';
import { UserDocument, User } from 'src/DB';
import { TokenRepository } from 'src/DB/repository/token.repository';
import { randomUUID } from 'crypto';
import { RoleEnum, tokenEnum } from '../enums';
import { DecodeOptions, JwtPayload } from 'jsonwebtoken';
import { TokenDocument } from 'src/DB/model/token.model';
import { LoginCredentials } from '../dtos/login-credentials.response.dto';

import { UserRepository } from 'src/DB/repository/user.repository';
import { RedisService } from './redis.service';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly tokenRepository: TokenRepository,
    private readonly userRepository: UserRepository,
    private readonly redisService: RedisService,
  ) { }

  signToken = ({
    payload,

    options = {
      expiresIn: Number(process.env.ACCESS_EXPIRES_IN),
      secret: process.env.ACCESS_USER_SIGNATURE as string,
    },
  }: {
    payload: JwtPayload;
    options?: JwtSignOptions;
  }): Promise<string> => {
    return this.jwtService.signAsync(payload, options);
  };

  verifyToken = ({
    token,

    options = { secret: process.env.ACCESS_USER_SIGNATURE as string },
  }: {
    token: string;

    options?: JwtVerifyOptions;
  }): Promise<any> => {
    return this.jwtService.verifyAsync(token, options);
  };
  decodeJwt = ({
    token,
    options,
  }: {
    token: string;

    options?: DecodeOptions;
  }): Promise<any> => {
    return this.jwtService.decode(token, options);
  };

  getSignatures = (
    role: RoleEnum,
  ): { access_signature: string; refresh_signature: string } => {
    let signatureLevel: { access_signature: string; refresh_signature: string };

    switch (role) {
      case RoleEnum.admin:
        signatureLevel = {
          access_signature: process.env.ACCESS_ADMIN_SIGNATURE as string,
          refresh_signature: process.env.REFRESH_ADMIN_SIGNATURE as string,
        };

        break;

      case RoleEnum.teacher:
        signatureLevel = {
          access_signature: process.env.ACCESS_TEACHER_SIGNATURE as string,
          refresh_signature: process.env.REFRESH_TEACHER_SIGNATURE as string,
        };

        break;

      default:
        signatureLevel = {
          access_signature: process.env.ACCESS_STUDENT_SIGNATURE as string,
          refresh_signature: process.env.REFRESH_STUDENT_SIGNATURE as string,
        };
        break;
    }

    return signatureLevel;
  };

  getdecodeSecret = (tokenType: tokenEnum, role: RoleEnum): string => {
    const decodeSecret = this.getSignatures(role || RoleEnum.student);

    return tokenType == tokenEnum.access
      ? decodeSecret.access_signature
      : decodeSecret.refresh_signature;
  };

  decodeToken = async ({
    tokenType = tokenEnum.access,
    authorization,
  }: {
    authorization: string;
    tokenType: tokenEnum;
  }): Promise<{
    user: UserDocument;
    decoded: JwtPayload;
  }> => {
    const [bearer, token] = authorization?.split(' ') || [];

    if (bearer !== 'Bearer' || !token) {
      throw new UnauthorizedException('unauthorized access');
    }

    // Check the Redis Blocklist FIRST (before signature verification)
    try {
      const isRevoked = await this.redisService.isTokenRevoked(token);
      if (isRevoked) {
        throw new UnauthorizedException(
          'Session expired. Please log in again.',
        );
      }
    } catch (error) {
      // If Redis connection fails, fail closed (reject the request)
      throw new UnauthorizedException(
        'Unable to validate token. Please try again.',
      );
    }

    // Decode payload WITHOUT verification to extract the role
    const unverifiedPayload = this.decodeJwt({ token }) as JwtPayload;
    if (!unverifiedPayload?.role) {
      throw new UnauthorizedException('unauthorized access');
    }

    // Now verify the token using the role from the payload itself
    let decoded: JwtPayload;
    const secret = this.getdecodeSecret(
      tokenType,
      unverifiedPayload.role as RoleEnum,
    );
    try {
      decoded = await this.verifyToken({
        token,
        options: {
          secret,
        },
      });
    } catch (error) {
      throw new UnauthorizedException('unauthorized access');
    }

    const user = await this.userRepository.findOne({
      filter: { _id: decoded.sub as string },
    });

    if (!user) {
      throw new ForbiddenException('access forbidden non existing user');
    }

    // Verify the role in the token matches the user's actual role in the DB
    if (decoded.role !== user.role) {
      throw new ForbiddenException(
        'access forbidden, role mismatch. Please login again.',
      );
    }

    if (
      await this.tokenRepository.findOne({
        filter: { jwtId: decoded.jti, createdBy: user?._id },
      })
    ) {
      throw new ForbiddenException('access forbidden ');
    }

    if (
      Number(user?.changeCredentialTime?.getTime()) >
      Number(decoded?.iat) * 1000
    ) {
      throw new ForbiddenException('access forbidden try logging in again');
    }

    return { user, decoded };
  };

  async generateLoginCredentials(
    user: User & { _id: string },
  ): Promise<LoginCredentials> {
    const { access_signature, refresh_signature } = this.getSignatures(
      user.role,
    );

    const jti = randomUUID();

    const refresh_token = await this.signToken({
      payload: { sub: user._id, jti, role: user.role },
      options: {
        expiresIn: Number(process.env.REFRESH_EXPIRES_IN),
        secret: refresh_signature,
      },
    });

    const access_token = await this.signToken({
      payload: { sub: user._id, jti, role: user.role },
      options: {
        expiresIn: Number(process.env.ACCESS_EXPIRES_IN),
        secret: access_signature,
      },
    });

    return { access_token, refresh_token };
  }
  revokeToken = async (decoded: JwtPayload): Promise<TokenDocument> => {
    return await this.tokenRepository.createToken({
      data: {
        createdBy: decoded.sub as string,
        jwtId: decoded.jti,
        expiresAt:
          Math.floor(Date.now() / 1000) +
          Number(process.env.REFRESH_EXPIRES_IN),
      },
    });
  };

  /**
   * Refresh access token using a valid refresh token
   * @param refreshToken - The refresh token string
   * @returns New access token with same JWT ID
   * @throws UnauthorizedException if refresh token is invalid or expired
   * @throws ForbiddenException if user doesn't exist, role mismatch, or token is revoked
   */
  async refreshAccessToken(refreshToken: string): Promise<string> {
    // Decode refresh token without verification to extract role
    const unverifiedPayload = this.decodeJwt({
      token: refreshToken,
    }) as JwtPayload;

    if (
      !unverifiedPayload?.role ||
      !unverifiedPayload?.sub ||
      !unverifiedPayload?.jti
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Verify signature using role-specific refresh secret
    const refreshSecret = this.getdecodeSecret(
      tokenEnum.refresh,
      unverifiedPayload.role as RoleEnum,
    );

    let decoded: JwtPayload;
    try {
      decoded = await this.verifyToken({
        token: refreshToken,
        options: { secret: refreshSecret },
      });
    } catch (error) {
      throw new UnauthorizedException(
        'Refresh token expired. Please log in again.',
      );
    }

    // Retrieve user from database
    const user = await this.userRepository.findOne({
      filter: { _id: decoded.sub as string },
    });

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    // Verify role matches current user role
    if (decoded.role !== user.role) {
      throw new ForbiddenException('Role mismatch. Please log in again.');
    }

    // Check if JWT ID is in the blocklist (token has been revoked)
    const isRevoked = await this.tokenRepository.findOne({
      filter: { jwtId: decoded.jti, createdBy: user._id },
    });

    if (isRevoked) {
      throw new ForbiddenException('Refresh token has been revoked');
    }

    // Check if credentials have changed since token was issued
    if (
      user.changeCredentialTime &&
      Number(user.changeCredentialTime.getTime()) > Number(decoded.iat) * 1000
    ) {
      throw new ForbiddenException('Credentials changed. Please log in again.');
    }

    // Generate new access token with same JWT ID
    const { access_signature } = this.getSignatures(user.role);

    const newAccessToken = await this.signToken({
      payload: {
        sub: user._id as unknown as string,
        jti: decoded.jti,
        role: user.role,
      },
      options: {
        expiresIn: Number(process.env.ACCESS_EXPIRES_IN),
        secret: access_signature,
      },
    });

    return newAccessToken;
  }
}
