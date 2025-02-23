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
    try {
      await this.folderSocketService.handleConnection(socket)
    } catch (error: any) {
      console.log('Folder socket connection error:', error)
      // TODO: send some message to the client so they know what to do?
      socket.disconnect()
    }
  }
}
