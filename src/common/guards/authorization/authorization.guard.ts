import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { RoleEnum } from 'src/common/enums';

@Injectable()
export class AuthorizationGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    let req: any;
    let userRole: RoleEnum;

    const accessRoles: RoleEnum[] = this.reflector.getAllAndOverride<
      RoleEnum[]
    >('Roles', [context.getHandler(), context.getClass()]) ?? [
      RoleEnum.student,
    ];

    switch (context.getType<string>()) {
      case 'http':
        req = context.switchToHttp().getRequest();
        userRole = req.credentials.user.role;

        if (accessRoles.includes(userRole)) return true;

        break;

      default:
        break;
    }

    return false;
  }
}
