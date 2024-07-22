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
  namespace:
    /^\/folders\/[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/,
})
export class FolderSocketGateway implements OnGatewayConnection, OnGatewayInit {
  @WebSocketServer()
  public readonly namespace: Namespace

  constructor(private readonly folderSocketService: FolderSocketService) {}

  afterInit(namespace: Namespace) {
    this.folderSocketService.setServer(namespace.server)
  }

  async handleConnection(socket: Socket): Promise<void> {
    await this.folderSocketService.handleConnection(socket)
  }
}
