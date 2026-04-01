# EduLearn — Project Memory

## 1. Project Overview

**EduLearn** is an e-learning platform backend built with **NestJS** (TypeScript). It manages courses, lessons with video content, quizzes, orders/payments, and user management across three roles: **Student**, **Teacher**, and **Admin**.

### Tech Stack
| Layer | Technology |
|---|---|
| Framework | NestJS (TypeScript) |
| Database | MongoDB via Mongoose (`@nestjs/mongoose`) |
| Caching / Token Blocklist | Redis via `ioredis` |
| File Storage | AWS S3 (pre-signed PUT/GET URLs) |
| CDN | AWS CloudFront (signed URLs via `@aws-sdk/cloudfront-signer`) |
| Payments | Paymob (Quick Links + HMAC webhook validation) |
| Auth | JWT (access + refresh tokens), Google OAuth2 |
| Email | Nodemailer via `@nestjs-modules/mailer` (event-driven) |
| Rate Limiting | `@nestjs/throttler` (100 req/60s global) |
| Validation | `class-validator` + `class-transformer` (whitelist, forbidNonWhitelisted, transform) |

---

## 2. Architecture

### Layered Design Pattern
```
Controller → Service → Repository → Mongoose Model
```

- **Controllers** — HTTP routing only. Extract params/body/user, delegate to service, wrap with `successResponse()`.
- **Services** — Pure business logic. Inject repositories (never Mongoose models directly).
- **Repositories** — All extend `DatabaseRepository<TRawDocument, TDocument>` base class. Encapsulate all Mongoose-specific logic (`$push`, `$pull`, `.populate()`, aggregations, ObjectId conversions).
- **Models** — Mongoose `@Schema` classes in `src/DB/model/`. Export `HydratedDocument<T>` type aliases and `MongooseModule.forFeature()` registrations.

### Base Repository (`src/DB/repository/database.repository.ts`)
Generic CRUD operations: `findOne`, `find`, `paginate`, `create`, `updateOne`, `findOneAndUpdate`, `findOneAndDelete`, `deleteOne`, `aggregate`, `countDocuments`. Auto-increments `__v` on updates.

### Response Pattern
All API responses use `IResponse<T>`:
```ts
interface IResponse<T = any> {
  message?: string;
  status?: number;
  data?: T;
}
```
Wrapped via `successResponse({ data, message })`.

---

## 3. Module Map

| Module | Controllers | Services | Key Endpoints |
|---|---|---|---|
| **Auth** | `auth.controller` | `auth.service` | signup, login, Google OAuth, OTP flows, logout, refresh |
| **User** | `user.controller` | `user.service` | profile CRUD, profile image upload/remove (S3+CDN) |
| **Admin** | `admin.controller` | `admin.service` | create/delete teacher, block/unblock student, user list, orders, dashboard stats |
| **Course** | `course.controller` | `course.service` | CRUD courses, status transitions (DRAFT→IN_PROGRESS→PUBLISHED→ARCHIVED), image upload |
| **Lesson** | `lesson.controller` | `lesson.service` | CRUD lessons, pre-signed upload URLs, video streaming via CDN, visibility toggle |
| **Teacher** | `teacher.controller` | `teacher.service` | list teachers (public), assigned courses |
| **Subject** | `subject.controller` | `subject.service` | CRUD subjects, courses by subject, teachers by subject |
| **Quiz** | `quiz.controller` | `quiz.service` | create/delete quiz, toggle visibility, start/submit quiz, results, performance analytics |
| **Question** | `question.controller` | `question.service` | CRUD questions per lesson/course |
| **Cart** | `cart.controller` | `cart.service` | get/add/remove/clear cart |
| **Order** | `order.controller` | `order.service` | create order from cart, checkout (Paymob), cancel, webhook |
| **GlobalAuth** | — | — | Authentication/Authorization guards (currently commented out in AppModule) |

---

## 4. Database Models (MongoDB)

| Model | Key Fields | Relations |
|---|---|---|
| `User` | firstName, lastName, email, password, role, provider, isBlocked, boughtLessons, degree, profileImage | boughtLessons → Lesson[] |
| `Course` | title, description, image, status, teacherId, subjectId, lessons[], quizzes[] | teacherId → User, subjectId → Subject |
| `Lesson` | title, description, courseId, videoUrl, videoFileId, price, isFree, isHidden, order | courseId → Course |
| `Subject` | name, description, courses[] | courses → Course[] |
| `Quiz` | title, description, timeLimitMinutes, minimumPassScore, lessonId, courseId, questions[], isHidden | questions → Question[] |
| `Question` | title, type, difficulty, options[], lessonId, courseId | lessonId → Lesson, courseId → Course |
| `QuizResult` | studentId, quizId, lessonId, courseId, score, totalQuestions, percentage, isPassed, answers[], attemptNumber | References quiz, lesson, course, user |
| `QuizSession` | studentId, quizId, startedAt | Time-limit enforcement |
| `Order` | studentId, lessons[] (snapshot), totalAmount, status, paymentGateway, gatewayOrderId | studentId → User |
| `Cart` | studentId, lessonIds[] | studentId → User, lessonIds → Lesson[] |
| `Token` | userId, refreshToken, deviceInfo | userId → User |

---

## 5. Key Patterns & Conventions

### ID Handling
- `EntityId` = `Types.ObjectId | string` (defined in `src/common/types.ts`)
- `toObjectId()` helper used in repositories to convert string IDs to `Types.ObjectId`
- Services always pass string IDs; repositories handle ObjectId conversions internally

### Auth & Guards
- `@Auth([RoleEnum.teacher, RoleEnum.admin], tokenEnum.access)` composite decorator for route protection
- `AuthenticationGuard` — validates JWT, checks Redis blocklist, checks `isBlocked`, checks `changeCredentialTime`
- `AuthorizationGuard` — checks user role against allowed roles
- `LessonAccessGuard` — checks lesson access (free, bought, teacher-owned, or admin)
- `QuizAttemptGuard` — validates quiz attempt eligibility

### AWS S3 and CDN
- **S3Service** handles file upload/delete and pre-signed PUT/GET URL generation
- **CdnService** generates CloudFront signed URLs for serving private content (videos, images)
- CDN key paths: `courses/{courseId}/lessons` (videos), `images/courses/` (images), `images/users/` (profile photos)

### Course Status Machine
```
DRAFT → IN_PROGRESS → PUBLISHED ↔ ARCHIVED
                    ↗ (republish from archived)
```

### Error Handling
- Uses NestJS HTTP exceptions (`NotFoundException`, `ForbiddenException`, `BadRequestException`, `ConflictException`, `UnauthorizedException`)
- S3 rollback on DB failure; old file cleanup on successful replacement

### Event-Driven Emails
- Uses `@nestjs/event-emitter` (`EventEmitter2`)
- OTPs for email confirmation and password reset

---

## 6. Environment Variables (from `.env` at `config/.env`)

Key variables: `DB_URI`, `PORT`, `JWT_SECRET`, `REFRESH_SECRET`, `AWS_BUCKET`, `AWS_REGION`, `AWS_ACCESS_KEY`, `AWS_SECRET_KEY`, `CLIENT_ID` (Google OAuth), `OTP_TTL_SECONDS`, `FORGOT_PASSWORD_VERIFIED_TTL`, `REDIS_HOST`, `REDIS_PORT`, `CF_DOMAIN`, `CF_KEY_PAIR_ID`, `CF_PRIVATE_KEY`, Paymob keys.

---

## 7. Project Commands

```bash
npm run start:dev   # Development server with hot reload
npm run build       # Compile to dist/
npm run start:prod  # Production server
npm run test        # Run unit tests (Jest)
npm run lint        # ESLint
```
