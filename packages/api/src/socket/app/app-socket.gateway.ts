import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets'
import { Namespace, Socket } from 'socket.io'

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
export class AppSocketGateway implements OnGatewayConnection {
  @WebSocketServer()
  public readonly namespace: Namespace

  constructor(private readonly appSocketService: AppSocketService) {
    setTimeout(() => this.appSocketService.setServer(this.namespace.server))
  }

  async handleConnection(socket: Socket): Promise<void> {
    await this.appSocketService.handleConnection(socket)
  }
}
