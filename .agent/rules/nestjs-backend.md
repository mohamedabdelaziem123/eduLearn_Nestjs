---
trigger: model_decision
---

# E-Learning Platform Backend Rules

## 1. Architecture & Design Patterns (Strict)
* **Repository Pattern:** We strictly enforce the Repository Pattern to decouple business logic from the database.
* **Services:** Must contain pure business logic. Services MUST NOT import Mongoose models directly. They must inject an Interface (e.g., `constructor(private readonly lessonRepo: ILessonRepository)`).
* **Repositories:** Database-specific logic (Mongoose `$match`, `$push`, `.populate()`) is strictly isolated inside files named `*.mongoose.repository.ts`.

## 2. Controllers & API Responses
* **Strictly No Business Logic in Controllers:** Controllers must ONLY handle routing, extracting HTTP parameters/body/user context, delegating to the appropriate Service, and returning the response. Do not perform database checks or complex data manipulation here.
* **Response Format:** All successful API responses must be wrapped using the standard utility and nested under a `data` object. (e.g., `return successResponse({ data: result, message: 'Success' });`).
* **Routing:** Maintain clear separation between Actor domains (e.g., `/teacher/courses/...` vs `/student/courses/...`).

## 3. Robustness & Edge Cases
* **Consider Edge Cases:** Always proactively anticipate and handle edge cases. Think about missing data, orphaned files (e.g., rolling back S3 uploads if a database save fails), race conditions, and invalid state transitions.
* **Error Handling:** Fail gracefully. Always throw the appropriate, specific NestJS HTTP exceptions (`NotFoundException`, `ForbiddenException`, `BadRequestException`, etc.) rather than generic errors.

## 4. Authentication & Token Management
* **Decorators:** Always use the custom `@Auth([RoleEnum.teacher, RoleEnum.admin])` decorator to protect routes.
* **User Context:** Always extract the current user using the custom `@User()` decorator (e.g., `@User() { _id }: UserDocument`).
* **Token Implementation & Revocation:** * **Access Tokens:** JWTs are stateless. Token revocation is handled via a **Redis Blocklist** using `ioredis`. 
  * **Refresh Tokens:** Must be accurately handled in the project. On user logout, password reset, or session revocation, you MUST explicitly delete the refresh token from the database AND add the active access token to the Redis blocklist. Do not rely solely on frontend deletion.

## 5. AWS S3 & Video Handling
* **Uploads:** Implement Direct-to-S3 uploads via Pre-signed PUT URLs. 
    * *Crucial:* Do not include a `Body` parameter when generating the S3 PutObjectCommand signature. Set `ContentType: 'video/mp4'`.
* **Viewing:** Videos in S3 are private. Always generate temporary Pre-signed GET URLs for the frontend video player.

## 6. Database Specifics (MongoDB/Mongoose)
* **References:** Handle `Types.ObjectId` conversions carefully. Note that `createFromHexString` can sometimes behave unpredictably; verify conversions during aggregation pipelines.