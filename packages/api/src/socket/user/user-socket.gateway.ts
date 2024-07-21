import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets'
import { Namespace, Socket } from 'socket.io'

import { UserSocketService } from './user-socket.service'

@WebSocketGateway({
  cors: {
    origin: '*', // TODO: constrain this
    allowedHeaders: [],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  namespace: '/user',
})
export class UserSocketGateway implements OnGatewayConnection {
  @WebSocketServer()
  public readonly namespace: Namespace

  constructor(private readonly userSocketService: UserSocketService) {
    setTimeout(() => this.userSocketService.setServer(this.namespace.server))
  }

  async handleConnection(socket: Socket): Promise<void> {
    await this.userSocketService.handleConnection(socket)
  }
}
