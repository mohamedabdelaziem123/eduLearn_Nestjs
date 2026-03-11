import { IResponse } from 'src/common/interfaces';

export const successResponse = <T = any>({
  message = 'done',
  status = 200,
  data,
}: {
  message?: string;
  status?: number;
  data?: T;
}): IResponse<T> => {
  return {
    message,
    status,
    data,
  };
};
