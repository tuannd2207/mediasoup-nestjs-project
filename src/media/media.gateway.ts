import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'ws';
import { MediaService } from './media.service';

@WebSocketGateway(3001, { cors: { origin: '*' }, transports: ['websocket'] })
export class MediaGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly mediaService: MediaService) {}

  afterInit(server: Server) {
    console.log('WebSocket server initialized on port 3001');
  }

  handleConnection(client: Socket) {
    console.log('Client connected');
    client.send(JSON.stringify({ message: 'Connected to mediasoup server' }));
  }

  handleDisconnect(client: Socket) {
    console.log('Client disconnected');
  }
}
