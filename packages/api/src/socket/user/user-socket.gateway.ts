import {
  OnGatewayConnection,
  OnGatewayInit,
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
export class UserSocketGateway implements OnGatewayConnection, OnGatewayInit {
  @WebSocketServer()
  public readonly namespace: Namespace | undefined

  constructor(private readonly userSocketService: UserSocketService) {}

  afterInit(namespace: Namespace) {
    this.userSocketService.setNamespace(namespace)
  }

  async handleConnection(socket: Socket): Promise<void> {
    try {
      await this.userSocketService.handleConnection(socket)
    } catch (error: unknown) {
      console.log('User socket connection error:', error)
      // TODO: send some message to the client so they know what to do?
      socket.disconnect()
    }
  }
}
