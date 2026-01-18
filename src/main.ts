import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable validation pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Setup Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Round-Robin Tournament API')
    .setDescription(
      'A RESTful API for managing round-robin sports tournaments. ' +
      'In a round-robin tournament, each participant must play against every other participant exactly once.',
    )
    .setVersion('1.0')
    .addTag('players', 'Player management endpoints')
    .addTag('tournaments', 'Tournament management endpoints')
    .addTag('games', 'Game results management endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  console.log(`🏆 Round-Robin Tournament API is running on: http://localhost:${port}`);
  console.log(`📚 Swagger API documentation available at: http://localhost:${port}/api`);
}
bootstrap();
