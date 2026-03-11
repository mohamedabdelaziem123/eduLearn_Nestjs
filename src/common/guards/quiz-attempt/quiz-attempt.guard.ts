import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import { QuizResultRepository } from 'src/DB/repository/quiz-result.repository';

const MAX_QUIZ_ATTEMPTS = 3;

@Injectable()
export class QuizAttemptGuard implements CanActivate {
    constructor(private readonly quizResultRepo: QuizResultRepository) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const req = context.switchToHttp().getRequest();
        const user = req.credentials?.user;
        const quizId = req.params?.id;

        if (!user || !quizId) return true; // let other guards handle auth

        const attempts = await this.quizResultRepo.countStudentAttempts(
            user._id.toString(),
            quizId,
        );

        if (attempts >= MAX_QUIZ_ATTEMPTS) {
            throw new ForbiddenException(
                `You have reached the maximum number of attempts (${MAX_QUIZ_ATTEMPTS}) for this quiz.`,
            );
        }

        return true;
    }
}
