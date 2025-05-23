// src/media/media.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import * as mediasoup from 'mediasoup';

@Injectable()
export class MediaService implements OnModuleInit {
  private worker: mediasoup.types.Worker;
  private router: mediasoup.types.Router;
  private transports: Map<string, mediasoup.types.WebRtcTransport> = new Map();
  private producers: Map<string, mediasoup.types.Producer> = new Map();

  async onModuleInit() {
    try {
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
    } catch (error) {
      console.error('Failed to initialize mediasoup:', error);
      throw error;
    }
  }

  getRouter() {
    return this.router;
  }

  async createTransport() {
    try {
      const transport = await this.router.createWebRtcTransport({
        listenIps: [
          {
            ip: '0.0.0.0',
            announcedIp: process.env.RAILWAY_PUBLIC_IP || '127.0.0.1',
          },
        ],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
      });
      this.transports.set(transport.id, transport);
      console.log(`Transport created: ${transport.id}`);
      return transport;
    } catch (error) {
      console.error('Failed to create transport:', error);
      throw error;
    }
  }

  getTransport(id: string) {
    return this.transports.get(id);
  }

  addProducer(producer: mediasoup.types.Producer) {
    this.producers.set(producer.id, producer);
    console.log(`Producer added: ${producer.id}`);
  }

  getProducers() {
    console.log(`Returning ${this.producers.size} producers`);
    return Array.from(this.producers.values());
  }
}
