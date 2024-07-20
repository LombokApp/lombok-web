import {
  OnGatewayConnection,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'

import { UserSocketService } from './user-socket.service'

@WebSocketGateway({
  cors: {
    origin: '*', // TODO: constrain this
    allowedHeaders: [],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  namespace: 'user',
})
export class UserSocketGateway implements OnGatewayConnection, OnGatewayInit {
  @WebSocketServer()
  private readonly server: Server

  constructor(private readonly userSocketService: UserSocketService) {}

  async handleConnection(socket: Socket): Promise<void> {
    await this.userSocketService.handleConnection(socket)
  }

  afterInit() {
    this.userSocketService.setServer(this.server)
  }
}
