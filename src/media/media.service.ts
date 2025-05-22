import { Injectable, OnModuleInit } from '@nestjs/common';
import * as mediasoup from 'mediasoup';

@Injectable()
export class MediaService implements OnModuleInit {
  private worker: mediasoup.types.Worker;
  private router: mediasoup.types.Router;

  async onModuleInit() {
    this.worker = await mediasoup.createWorker({
      logLevel: 'debug',
      rtcMinPort: 10000,
      rtcMaxPort: 10100,
    });

    this.worker.on('died', () => {
      console.error('mediasoup worker died, exiting...');
      process.exit(1);
    });

    this.router = await this.worker.createRouter({
      mediaCodecs: [
        {
          kind: 'audio',
          mimeType: 'audio/opus',
          clockRate: 48000,
          channels: 2,
        },
        {
          kind: 'video',
          mimeType: 'video/VP8',
          clockRate: 90000,
          parameters: {
            'x-google-start-bitrate': 1000,
          },
        },
      ],
    });

    console.log('mediasoup worker and router initialized');
  }

  getRouter() {
    return this.router;
  }
}