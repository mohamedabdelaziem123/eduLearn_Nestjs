import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { tokenEnum } from 'src/common/enums';
import { TokenService } from 'src/common/services';

@Injectable()
export class AuthenticationGuard implements CanActivate {
  constructor(
    private readonly TokenService: TokenService,
    private readonly reflector: Reflector,
  ) { }
  async canActivate(context: ExecutionContext): Promise<boolean> {
    let req: any;
    let authorization: string | undefined;

    const tokenType: tokenEnum =
      this.reflector.getAllAndOverride<tokenEnum>('tokenType', [
        context.getHandler(),
        context.getClass(),
      ]) ?? tokenEnum.access;

    switch (context.getType<string>()) {
      case 'http':
        req = context.switchToHttp().getRequest();
        authorization = req.headers.authorization;
        break;

      default:
        break;
    }

    if (!authorization) {
      throw new UnauthorizedException('No token provided');
    }
    const { user, decoded } = await this.TokenService.decodeToken({
      tokenType,
      authorization: authorization,
    });

    // Block check — instantly rejects any request from a blocked user
    if (user.isBlocked) {
      throw new ForbiddenException(
        'Your account has been blocked. Please contact support.',
      );
    }

    req.credentials = { user, decoded };

    return true;
  }
}
