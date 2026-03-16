import { Injectable, NotFoundException } from '@nestjs/common';
import { CourseRepository } from 'src/DB/repository/course.repository';
import { UserDocument, UserRepository } from 'src/DB';
import { CdnService, CourseStatus, GetAllDto, RoleEnum } from 'src/common';

@Injectable()
export class TeacherService {
  constructor(
    private readonly courseRepository: CourseRepository,
    private readonly userRepository: UserRepository,
    private readonly cdnService: CdnService,
  ) { }

  /** List all teachers (public) */
  async getAllTeachers() {
    const teachers = await this.userRepository.find({
      filter: { role: RoleEnum.teacher },
      projection: '-password -__v -boughtLessons -changeCredentialTime',
    });

    return teachers.map((t: any) => {
      const obj = t.toJSON ? t.toJSON() : t;
      if (obj.profileImage) {
        obj.profileImage = this.cdnService.getSignedUrl(obj.profileImage);
      }
      return obj;
    });
  }

  /** Get courses assigned to the logged-in teacher */
  async getMyAssignedCourses(user: UserDocument, { page, size }: GetAllDto) {
    const pageParam = page === 'all' ? 'all' : Number(page);
    const sizeParam = Number(size);

    return this.courseRepository.paginate({
      filter: { teacherId: user._id, status: { $in: [CourseStatus.PUBLISHED, CourseStatus.IN_PROGRESS] } },
      size: sizeParam,
      page: pageParam,
      options: {
        sort: { createdAt: -1 },
        populate: [{ path: 'subjectId', select: 'name' }],
      },
    });
  }

  /** Get a specific course assigned to a teacher */
  async getAssignedCourseById(teacherId: string, courseId: string) {
    const course = await this.courseRepository.findByTeacher(
      courseId,
      teacherId,
    );

    if (!course) {
      throw new NotFoundException(
        'Course not found or you are not assigned to it.',
      );
    }

    return course;
  }
}
