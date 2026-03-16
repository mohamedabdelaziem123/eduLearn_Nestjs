import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { UserRepository } from 'src/DB/repository/user.repository';
import { CourseRepository } from 'src/DB/repository/course.repository';
import { LessonRepository } from 'src/DB/repository/lesson.repository';
import { CreateBlankCourseDto } from './dto/create-course.dto';
import { CreateCourseResponse } from './entities/course.entity';
import { CdnService, CourseStatus, GetAllDto, RoleEnum, S3Service } from 'src/common';
import { UpdateCourseDto } from './dto/update-course.dto';

@Injectable()
export class CourseService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly courseRepository: CourseRepository,
    private readonly lessonRepository: LessonRepository,
    private readonly s3Service: S3Service,
    private readonly cdnService: CdnService,
  ) { }

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATE
  // ═══════════════════════════════════════════════════════════════════════════

  async createBlankCourse(
    data: CreateBlankCourseDto,
    file: Express.Multer.File,
  ): Promise<CreateCourseResponse> {
    if (!file) {
      throw new BadRequestException('Course image is required');
    }
    // 1. Verify the teacher exists
    const teacher = await this.userRepository.findOne({
      filter: { _id: data.teacherId, role: RoleEnum.teacher },
    });

    if (!teacher) {
      throw new NotFoundException(
        'Teacher not found or user is not a teacher.',
      );
    }

    // 2. Upload the image to AWS S3
    const imageUrl = await this.s3Service.uploadFile({
      file,
      path: `images/courses/${data.teacherId}_${data.title}`,
    });

    if (!imageUrl) {
      throw new BadRequestException('fail to upload the image');
    }

    // 3. Create the blank course (defaults to DRAFT status)
    const newCourse = await this.courseRepository.createCourse({
      title: data.title,
      description: data.description,
      teacherId: String(data.teacherId),
      subjectId: String(data.subjectId),
      image: imageUrl,
    });

    if (!newCourse) {
      await this.s3Service.deleteFile({ Key: imageUrl });
      throw new BadRequestException('fail to create the course');
    }

    return {
      courseId: newCourse._id,
      title: newCourse.title,
      teacherId: newCourse.teacherId,
      status: newCourse.status,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GET ALL COURSES (role-aware visibility)
  // ═══════════════════════════════════════════════════════════════════════════

  async getAllCourses(
    { page, size }: GetAllDto,
    role?: RoleEnum,
    userId?: string,
  ) {
    const pageParam = page === 'all' ? 'all' : Number(page);
    const sizeParam = Number(size);

    // Build role-aware filter
    let filter: Record<string, any> = {};

    if (role === RoleEnum.admin) {
      // Admins see everything
      filter = {};
    } else if (role === RoleEnum.teacher && userId) {
      // Teachers see their own courses that are IN_PROGRESS, PUBLISHED, or ARCHIVED
      filter = {
        teacherId: userId,
        status: {
          $in: [
            CourseStatus.IN_PROGRESS,
            CourseStatus.PUBLISHED,
            
          ],
        },
      };
    } else {
      // Students & unauthenticated users only see PUBLISHED
      filter = { status: CourseStatus.PUBLISHED };
    }

    const result = await this.courseRepository.paginate({
      filter,
      size: sizeParam,
      page: pageParam,
      options: {
        sort: { createdAt: -1 },
        populate: [
          { path: 'teacherId', select: 'firstName lastName email' },
          { path: 'subjectId', select: 'name' },
        ],
      },
    });

    // Transform image keys to CloudFront signed URLs
    if (Array.isArray(result.Result)) {
      result.Result = result.Result.map((course: any) => {
        const obj = course.toJSON ? course.toJSON() : course;
        if (obj.image) obj.image = this.cdnService.getSignedUrl(obj.image);
        return obj;
      });
    }

    return result;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GET COURSE BY ID
  // ═══════════════════════════════════════════════════════════════════════════

  async getCourseById(courseId: string) {
    const course = await this.courseRepository.findOne({
      filter: { _id: courseId },
      options: {
        populate: [
          { path: 'teacherId', select: 'firstName lastName email' },
          { path: 'subjectId', select: 'name' },
        ],
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Transform image key to CloudFront signed URL
    const courseObj = course.toJSON ? course.toJSON() : course;
    if (courseObj.image) courseObj.image = this.cdnService.getSignedUrl(courseObj.image);

    return courseObj;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UPDATE COURSE
  // ═══════════════════════════════════════════════════════════════════════════

  async updateCourse(
    courseId: string,
    data: UpdateCourseDto,
    file?: Express.Multer.File,
  ) {
    // 1. FAIL FAST: Check if course exists
    const existingCourse = await this.courseRepository.findOne({
      filter: { _id: courseId },
    });

    if (!existingCourse) {
      throw new NotFoundException('Course not found');
    }

    let imageUrl: string | undefined = undefined;

    // 2. Upload to S3 if a file is provided
    if (file) {
      const targetTeacherId = data.teacherId || existingCourse.teacherId;
      const targetTitle = data.title || existingCourse.title;

      imageUrl = await this.s3Service.uploadFile({
        file,
        path: `images/courses/${targetTeacherId}_${targetTitle}`,
      });

      if (!imageUrl) {
        throw new BadRequestException('Failed to upload the new image');
      }
    }

    // 3. Delegate to repository (handles ObjectId casting for teacherId/subjectId)
    const updatedCourse = await this.courseRepository.updateCourse(courseId, {
      ...data,
      ...(imageUrl ? { image: imageUrl } : {}),
    });

    // Handle DB failure after S3 upload
    if (!updatedCourse) {
      if (imageUrl) {
        await this.s3Service.deleteFile({ Key: imageUrl });
      }
      throw new BadRequestException('Failed to update course in database');
    }

    // 5. Cleanup the exact old image from S3
    if (file && existingCourse.image) {
      try {
        await this.s3Service.deleteFile({ Key: existingCourse.image });
      } catch (error) {
        console.error('Failed to delete old S3 image:', error.message);
      }
    }

    return updatedCourse;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STATUS TRANSITIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * DRAFT → IN_PROGRESS  (Admin only)
   * Makes the course visible to the assigned teacher so they can start adding lessons.
   */
  async startProgress(courseId: string) {
    const course = await this.courseRepository.findOne({
      filter: { _id: courseId },
    });

    if (!course) throw new NotFoundException('Course not found');

    if (course.status !== CourseStatus.DRAFT) {
      throw new BadRequestException(
        `Cannot start progress on a course with status "${course.status}". Only DRAFT courses can be moved to IN_PROGRESS.`,
      );
    }

    return this.courseRepository.findOneAndUpdate({
      filter: { _id: courseId },
      update: { status: CourseStatus.IN_PROGRESS },
      options: { new: true },
    });
  }

  /**
   * IN_PROGRESS | ARCHIVED → PUBLISHED  (Admin or owning Teacher)
   * Makes the course visible to students.
   */
  async publishCourse(courseId: string, userId: string, role: RoleEnum) {
    const course = await this.courseRepository.findOne({
      filter: { _id: courseId },
    });

    if (!course) throw new NotFoundException('Course not found');

    // Only admin or the owning teacher
    if (
      role !== RoleEnum.admin &&
      String(course.teacherId) !== String(userId)
    ) {
      throw new ForbiddenException(
        'Only the assigned teacher or an admin can publish this course.',
      );
    }

    const allowed = [CourseStatus.IN_PROGRESS, CourseStatus.ARCHIVED];
    if (!allowed.includes(course.status)) {
      throw new BadRequestException(
        `Cannot publish a course with status "${course.status}". Only IN_PROGRESS or ARCHIVED courses can be published.`,
      );
    }

    return this.courseRepository.findOneAndUpdate({
      filter: { _id: courseId },
      update: { status: CourseStatus.PUBLISHED },
      options: { new: true },
    });
  }

  /**
   * PUBLISHED → IN_PROGRESS  (Admin or owning Teacher)
   * Hides the course from the public catalog; teacher can still edit.
   */
  async unpublishCourse(courseId: string, userId: string, role: RoleEnum) {
    const course = await this.courseRepository.findOne({
      filter: { _id: courseId },
    });

    if (!course) throw new NotFoundException('Course not found');

    if (
      role !== RoleEnum.admin &&
      String(course.teacherId) !== String(userId)
    ) {
      throw new ForbiddenException(
        'Only the assigned teacher or an admin can unpublish this course.',
      );
    }

    if (course.status !== CourseStatus.PUBLISHED) {
      throw new BadRequestException(
        `Cannot unpublish a course with status "${course.status}". Only PUBLISHED courses can be unpublished.`,
      );
    }

    return this.courseRepository.findOneAndUpdate({
      filter: { _id: courseId },
      update: { status: CourseStatus.IN_PROGRESS },
      options: { new: true },
    });
  }

  /**
   * Any non-ARCHIVED → ARCHIVED  (Admin or owning Teacher)
   * Retires the course from the platform.
   */
  async archiveCourse(courseId: string, userId: string, role: RoleEnum) {
    const course = await this.courseRepository.findOne({
      filter: { _id: courseId },
    });

    if (!course) throw new NotFoundException('Course not found');

    if (
      role !== RoleEnum.admin
    ) {
      throw new ForbiddenException(
        'Only the  admin can archive this course.',
      );
    }

    if (course.status === CourseStatus.ARCHIVED) {
      throw new BadRequestException('This course is already archived.');
    }

    return this.courseRepository.findOneAndUpdate({
      filter: { _id: courseId },
      update: { status: CourseStatus.ARCHIVED },
      options: { new: true },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DELETE COURSE (Admin only — cascades to lessons + S3 assets)
  // ═══════════════════════════════════════════════════════════════════════════

  async deleteCourse(courseId: string): Promise<void> {
    // 1. Verify course exists
    const course = await this.courseRepository.findOne({
      filter: { _id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // 2. Find all lessons belonging to this course
    const lessons = await this.lessonRepository.findLessonsByCourse(courseId);

    // 3. Delete lesson video files from S3 (fire-and-forget)
    const s3Deletions = lessons
      .filter((lesson) => lesson.videoFileId)
      .map((lesson) =>
        this.s3Service
          .deleteFile({ Key: lesson.videoFileId })
          .catch((err) =>
            console.error(`Failed to delete video ${lesson.videoFileId}:`, err),
          ),
      );

    // 4. Delete the course image from S3 (fire-and-forget)
    if (course.image) {
      s3Deletions.push(
        this.s3Service
          .deleteFile({ Key: course.image })
          .catch((err) =>
            console.error(`Failed to delete course image:`, err),
          ),
      );
    }

    // Run all S3 deletions in parallel (don't block the response)
    await Promise.allSettled(s3Deletions);

    // 5. Delete all lesson documents in bulk
    if (lessons.length > 0) {
      await this.lessonRepository.deleteByCourse(courseId);
    }

    // 6. Delete the course document
    await this.courseRepository.deleteOne({
      filter: { _id: courseId },
    });
  }
}
