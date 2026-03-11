import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const User = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    switch (ctx.getType<string>()) {
      case 'http':
        return ctx.switchToHttp().getRequest().credentials.user;

      default:
        return undefined;
    }
  },
);
