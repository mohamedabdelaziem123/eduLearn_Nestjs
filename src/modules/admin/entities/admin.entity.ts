import { EntityId } from 'src/common/types';

export class Admin { }

export class createTeacherResponse {
  teacherId: EntityId;
  email: string;
}

export class DashboardUserCounts {
  students: number;
  teachers: number;
  admins: number;
}

export class DashboardStatsResponse {
  totalRevenue: number;
  totalPaidOrders: number;
  users: DashboardUserCounts;
  totalCourses: number;
  totalLessonsSold: number;
  blockedStudents: number;
}
