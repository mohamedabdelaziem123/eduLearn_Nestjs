import { Lean } from 'src/DB';

export class GetAllResponse<T = any> {
  DocCount: number | undefined;
  pages: number | undefined;
  currentPage: number | undefined | 'all';
  limit: number | undefined;
  Result: T[] | Lean<T>;
}
