import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. Helmet: Security Headers
  app.use(helmet());

  // 2. Strict CORS Configuration
  app.enableCors({
    origin: '*', // Change this to your frontend URL in production (e.g., 'https://my-frontend.com')
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3000, () => {
    console.log(`server is running on port ${process.env.PORT} `);
  });
}
bootstrap();
