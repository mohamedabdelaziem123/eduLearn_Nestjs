import { Lean } from 'src/DB/repository/database.repository';

export class GetAllResponse<T = any> {
  DocCount: number | undefined;
  pages: number | undefined;
  currentPage: number | undefined | 'all';
  limit: number | undefined;
  Result: T[] | Lean<T>;
}

// export class GetOneResponse <T=any>{
//   brand: T | Lean<T>;
// }
