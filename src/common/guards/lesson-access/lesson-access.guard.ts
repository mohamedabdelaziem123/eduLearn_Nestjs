import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { LessonRepository } from 'src/DB/repository/lesson.repository';

@Injectable()
export class LessonAccessGuard implements CanActivate {
    constructor(private readonly lessonRepo: LessonRepository) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const req = context.switchToHttp().getRequest();
        const user = req.credentials?.user;
        const lessonId = req.params?.lessonId;

        // If no lessonId param or no user, skip (let other guards/pipes handle it)
        if (!lessonId || !user) return true;

        // Admins and teachers always pass
        if (user.role === 'admin' || user.role === 'teacher') return true;

        const lesson = await this.lessonRepo.findOne({
            filter: { _id: lessonId },
        });

        if (!lesson) throw new NotFoundException('Lesson not found');

        // Free lessons are always accessible
        if (lesson.isFree) return true;

        // Check if student has bought this lesson
        const boughtLessons: string[] = (user.boughtLessons ?? []).map(String);
        if (boughtLessons.includes(String(lesson._id))) {
            return true;
        }

        throw new ForbiddenException(
            'You must purchase this lesson to access it.',
        );
    }
}
