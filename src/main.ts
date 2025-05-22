// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WsAdapter } from '@nestjs/platform-ws';

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule);
    app.useWebSocketAdapter(new WsAdapter(app));
    app.enableCors({ origin: '*' });
    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
    await app.listen(port);
    console.log(`NestJS server running on port ${port}`);
    console.log(
      `WebSocket endpoint available at wss://<your-railway-domain>/ws`
    );
  } catch (error) {
    console.error('Server failed to start:', error);
    process.exit(1);
  }
}

bootstrap();
