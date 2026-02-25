import { Logger } from '@nestjs/common'
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets'
import { Namespace, Socket } from 'socket.io'

import { AppUserSocketService } from './app-user-socket.service'

@WebSocketGateway({
  cors: {
    origin: '*', // TODO: constrain this (CHORE-04 will fix all gateways)
    allowedHeaders: [],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  namespace: '/app-user',
})
export class AppUserSocketGateway
  implements OnGatewayConnection, OnGatewayInit
{
  @WebSocketServer()
  public readonly namespace: Namespace | undefined
  private readonly logger = new Logger(AppUserSocketGateway.name)

  constructor(private readonly appUserSocketService: AppUserSocketService) {}

  afterInit(namespace: Namespace): void {
    this.appUserSocketService.setNamespace(namespace)
  }

  async handleConnection(socket: Socket): Promise<void> {
    try {
      await this.appUserSocketService.handleConnection(socket)
    } catch (error: unknown) {
      this.logger.error('AppUser socket connection error:', error)
      socket.disconnect()
    }
  }

  @SubscribeMessage('subscribe')
  async handleSubscribe(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { folderId: string; appIdentifier: string },
  ): Promise<void> {
    if (data.folderId && data.appIdentifier) {
      await this.appUserSocketService.subscribeFolderScope(socket, data)
    }
  }

  @SubscribeMessage('unsubscribe')
  async handleUnsubscribe(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { folderId: string },
  ): Promise<void> {
    if (data.folderId) {
      await this.appUserSocketService.unsubscribeFolderScope(socket, data)
    }
  }
}
