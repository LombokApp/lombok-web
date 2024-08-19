import {
  OnGatewayConnection,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets'
import { Namespace, Socket } from 'socket.io'

import { FolderSocketService } from './folder-socket.service'

@WebSocketGateway({
  cors: {
    origin: '*', // TODO: constrain this
    allowedHeaders: [],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  namespace: '/folder',
})
export class FolderSocketGateway implements OnGatewayConnection, OnGatewayInit {
  @WebSocketServer()
  public readonly namespace: Namespace | undefined

  constructor(private readonly folderSocketService: FolderSocketService) {}

  afterInit(namespace: Namespace) {
    this.folderSocketService.setNamespace(namespace)
  }

  async handleConnection(socket: Socket): Promise<void> {
    await this.folderSocketService.handleConnection(socket)
  }
}
