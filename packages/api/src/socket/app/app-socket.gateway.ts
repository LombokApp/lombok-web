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
  namespace: '/apps',
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
