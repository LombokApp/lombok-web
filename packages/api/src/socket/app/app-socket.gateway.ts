import {
  OnGatewayConnection,
  OnGatewayInit,
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
export class AppSocketGateway implements OnGatewayConnection, OnGatewayInit {
  @WebSocketServer()
  public readonly namespace: Namespace

  constructor(private readonly appSocketService: AppSocketService) {}

  afterInit(namespace: Namespace) {
    this.appSocketService.setNamespace(namespace)
  }

  async handleConnection(socket: Socket): Promise<void> {
    await this.appSocketService.handleConnection(socket)
  }
}
