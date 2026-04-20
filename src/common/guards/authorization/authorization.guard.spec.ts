import { AuthorizationGuard } from './authorization.guard';

describe('AuthorizationGuard', () => {
  it('should be defined', () => {
    const reflectorMock = {} as any;
    expect(new AuthorizationGuard(reflectorMock)).toBeDefined();
  });
});
