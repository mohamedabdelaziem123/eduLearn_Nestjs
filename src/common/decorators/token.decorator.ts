import { CustomDecorator, SetMetadata } from '@nestjs/common';
import { tokenEnum } from '../enums';

export const Token = (
  tokenType: tokenEnum = tokenEnum.access,
): CustomDecorator<string> => {
  return SetMetadata('tokenType', tokenType);
};
