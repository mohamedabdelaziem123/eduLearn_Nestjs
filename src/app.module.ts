import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { resolve } from 'node:path';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { GlobalAuthenticationModule } from './modules/global-auth/global-authentication.module';
import { AdminModule } from './modules/admin/admin.module';
import { CourseModule } from './modules/course/course.module';
import { TeacherModule } from './modules/teacher/teacher.module';
import { LessonModule } from './modules/lesson/lesson.module';
import { QuizModule } from './modules/quiz/quiz.module';
import { OrderModule } from './modules/order/order.module';
import { CartModule } from './modules/cart/cart.module';
import { SubjectModule } from './modules/subject/subject.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: resolve('./config/.env'),
    }),
    MongooseModule.forRoot(process.env.DB_URI as string),
    EventEmitterModule.forRoot(),
    ThrottlerModule.forRoot([{
      ttl: 60000, // 60 seconds
      limit: 100, // 100 requests per IP per TTL
    }]),
    AuthModule,
    UserModule,
    //GlobalAuthenticationModule,
    AdminModule,
    CourseModule,
    TeacherModule,
    LessonModule,
    QuizModule,
    OrderModule,
    CartModule,
    SubjectModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule { }
