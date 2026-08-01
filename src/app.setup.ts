import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppConfigService } from './config/app-config.service';

export function configureApp(app: INestApplication): INestApplication {
  const config = app.get(AppConfigService).get();

  app.setGlobalPrefix('api/v1');
  app.enableCors({ origin: config.webAppUrl, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      forbidNonWhitelisted: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('XKILL API')
    .setDescription(
      'Backend REST API for XKILL — placement preparation, college ERP, competitive programming and job marketplace. ' +
        'All protected routes require `Authorization: Bearer <accessToken>`.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  return app;
}
