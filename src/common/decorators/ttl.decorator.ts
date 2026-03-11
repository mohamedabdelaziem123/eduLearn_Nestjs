import { CustomDecorator, SetMetadata } from '@nestjs/common';

export const Ttl = (Ttl: number): CustomDecorator<string> => {
  return SetMetadata('Ttl', Ttl);
};
