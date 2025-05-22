// src/media/media.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'ws';
import { MediaService } from './media.service';

@WebSocketGateway({ cors: { origin: '*' }, transports: ['websocket'] })
export class MediaGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(private readonly mediaService: MediaService) {}

  afterInit(server: Server) {
    console.log('WebSocket server initialized');
  }

  handleConnection(client: Socket) {
    console.log('Client connected');
    client.send(JSON.stringify({ message: 'Connected to mediasoup server' }));
  }

  handleDisconnect(client: Socket) {
    console.log('Client disconnected');
  }

  @SubscribeMessage('message')
  async handleMessage(client: Socket, data: string) {
    const message = JSON.parse(data);
    const router = this.mediaService.getRouter();

    switch (message.type) {
      case 'getRouterRtpCapabilities':
        client.send(
          JSON.stringify({
            type: 'routerRtpCapabilities',
            data: router.rtpCapabilities,
          })
        );
        break;
      case 'createProducerTransport':
        const transport = await this.mediaService.createTransport();
        client.send(
          JSON.stringify({
            type: 'producerTransportCreated',
            data: {
              id: transport.id,
              iceParameters: transport.iceParameters,
              iceCandidates: transport.iceCandidates,
              dtlsParameters: transport.dtlsParameters,
            },
          })
        );
        break;
      case 'connectProducerTransport':
        const transportConnect = this.mediaService.getTransport(
          message.dtlsParameters.id
        );
        if (transportConnect) {
          await transportConnect.connect({
            dtlsParameters: message.dtlsParameters,
          });
          client.send(JSON.stringify({ type: 'transportConnected' }));
        } else {
          console.error(
            'Transport not found for id:',
            message.dtlsParameters.id
          );
          client.send(
            JSON.stringify({ type: 'error', message: 'Transport not found' })
          );
        }
        break;
      case 'produce':
        const transportProduce = this.mediaService.getTransport(
          message.rtpParameters.id
        );
        if (transportProduce) {
          const producer = await transportProduce.produce({
            kind: message.kind,
            rtpParameters: message.rtpParameters,
          });
          client.send(
            JSON.stringify({
              type: 'producerCreated',
              data: { id: producer.id },
            })
          );
        } else {
          console.error(
            'Transport not found for id:',
            message.rtpParameters.id
          );
          client.send(
            JSON.stringify({ type: 'error', message: 'Transport not found' })
          );
        }
        break;
    }
  }
}
