import {
  OnGatewayConnection,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'

import { AppSocketService } from './app-socket.service'

@WebSocketGateway({
  cors: {
    origin: '*', // TODO: constrain this
    allowedHeaders: [],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  namespace:
    /^\/apps\/[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/, // TODO: change this to handle the appIdentifier
})
export class AppSocketGateway implements OnGatewayConnection, OnGatewayInit {
  @WebSocketServer()
  private readonly server: Server

  constructor(private readonly appSocketService: AppSocketService) {}

  async handleConnection(socket: Socket): Promise<void> {
    await this.appSocketService.handleConnection(socket)
  }

  afterInit() {
    this.appSocketService.setServer(this.server)
  }
}
