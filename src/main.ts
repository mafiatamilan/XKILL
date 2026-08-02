import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { JsonLoggerService } from './common/logger/json-logger.service';
import { AppConfigService } from './config/app-config.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(JsonLoggerService));
  await configureApp(app);
  const port = app.get(AppConfigService).get().port;
  await app.listen(port);
  const logger = app.get(JsonLoggerService);
  logger.log(`XKILL API listening on http://localhost:${port}/api/v1`, 'Bootstrap');
  logger.log(`Swagger docs on http://localhost:${port}/api/docs`, 'Bootstrap');
}

void bootstrap();
