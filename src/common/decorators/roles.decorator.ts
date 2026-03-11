import { CustomDecorator, SetMetadata } from '@nestjs/common';
import { RoleEnum } from '../enums';

export const Roles = (
  accessRoles: RoleEnum[] = [
    RoleEnum.admin,
    RoleEnum.student,
    RoleEnum.teacher,
  ],
): CustomDecorator<string> => {
  return SetMetadata('Roles', accessRoles);
};
