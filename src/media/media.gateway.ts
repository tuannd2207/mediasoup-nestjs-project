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

@WebSocketGateway({
  path: '/ws',
  cors: { origin: '*' },
  transports: ['websocket'],
})
export class MediaGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(private readonly mediaService: MediaService) {}

  afterInit(server: Server) {
    console.log('WebSocket server initialized at /ws');
  }

  handleConnection(client: Socket) {
    console.log('Client connected:', client._socket.remoteAddress || 'unknown');
    client.send(JSON.stringify({ message: 'Connected to mediasoup server' }));
  }

  handleDisconnect(client: Socket) {
    console.log(
      'Client disconnected:',
      client._socket.remoteAddress || 'unknown'
    );
  }

  @SubscribeMessage('message')
  async handleMessage(client: Socket, data: string) {
    console.log('Received message:', data);
    let message;
    try {
      message = JSON.parse(data);
    } catch (error) {
      console.error('Invalid message format:', error);
      client.send(
        JSON.stringify({ type: 'error', message: 'Invalid message format' })
      );
      return;
    }

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
        const producerTransport = await this.mediaService.createTransport();
        client.send(
          JSON.stringify({
            type: 'producerTransportCreated',
            data: {
              id: producerTransport.id,
              iceParameters: producerTransport.iceParameters,
              iceCandidates: producerTransport.iceCandidates,
              dtlsParameters: producerTransport.dtlsParameters,
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
          this.mediaService.addProducer(producer);
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
      case 'createConsumerTransport':
        const consumerTransport = await this.mediaService.createTransport();
        client.send(
          JSON.stringify({
            type: 'consumerTransportCreated',
            data: {
              id: consumerTransport.id,
              iceParameters: consumerTransport.iceParameters,
              iceCandidates: consumerTransport.iceCandidates,
              dtlsParameters: consumerTransport.dtlsParameters,
            },
          })
        );
        break;
      case 'connectConsumerTransport':
        const transportConsumer = this.mediaService.getTransport(
          message.dtlsParameters.id
        );
        if (transportConsumer) {
          await transportConsumer.connect({
            dtlsParameters: message.dtlsParameters,
          });
          client.send(JSON.stringify({ type: 'consumerTransportConnected' }));
        } else {
          console.error(
            'Consumer transport not found for id:',
            message.dtlsParameters.id
          );
          client.send(
            JSON.stringify({
              type: 'error',
              message: 'Consumer transport not found',
            })
          );
        }
        break;
      case 'consume':
        const producers = this.mediaService.getProducers();
        const consumers = await Promise.all(
          producers.map(async (producer) => {
            if (
              router.canConsume({
                producerId: producer.id,
                rtpCapabilities: message.rtpCapabilities,
              })
            ) {
              const consumerTransport = this.mediaService.getTransport(
                message.transportId
              );
              if (consumerTransport) {
                const consumer = await consumerTransport.consume({
                  producerId: producer.id,
                  rtpCapabilities: message.rtpCapabilities,
                  paused: false,
                });
                return {
                  producerId: producer.id,
                  id: consumer.id,
                  kind: consumer.kind,
                  rtpParameters: consumer.rtpParameters,
                  type: consumer.type,
                };
              }
            }
            return null;
          })
        );
        const validConsumers = consumers.filter((c) => c !== null);
        console.log(`Sending ${validConsumers.length} consumers to client`);
        client.send(
          JSON.stringify({
            type: 'consumersCreated',
            data: validConsumers,
          })
        );
        break;
      default:
        console.warn('Unknown message type:', message.type);
        client.send(
          JSON.stringify({ type: 'error', message: 'Unknown message type' })
        );
    }
  }
}
