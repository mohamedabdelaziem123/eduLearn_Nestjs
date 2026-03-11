import { applyDecorators, UseGuards } from '@nestjs/common';
import { Roles } from './roles.decorator';
import { Token } from './token.decorator';
import { AuthenticationGuard, AuthorizationGuard } from '../guards';
import { RoleEnum, tokenEnum } from '../enums';

export const Auth = (
  accessRoles: RoleEnum[] = [
    RoleEnum.admin,
    RoleEnum.teacher,
    RoleEnum.student,
  ],
  tokenType: tokenEnum = tokenEnum.access,
) => {
  return applyDecorators(
    Token(tokenType),
    Roles(accessRoles),
    UseGuards(AuthenticationGuard, AuthorizationGuard),
  );
};
