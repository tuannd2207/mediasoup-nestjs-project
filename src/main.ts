// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WsAdapter } from '@nestjs/platform-ws';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useWebSocketAdapter(new WsAdapter(app)); // Đảm bảo WebSocket adapter
  app.enableCors({ origin: '*' }); // Cho phép CORS
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`NestJS server running on port ${port}`);
}
bootstrap();