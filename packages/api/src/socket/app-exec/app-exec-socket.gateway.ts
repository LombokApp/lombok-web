import { Logger } from '@nestjs/common'
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets'
import { Socket } from 'socket.io'

import { AppExecSocketService } from './app-exec-socket.service'

@WebSocketGateway({
  cors: {
    origin: '*', // TODO: constrain this (CHORE-04 will fix all gateways)
    allowedHeaders: [],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  namespace: /^\/app-exec\/[^/]+\/.+$/,
})
export class AppExecSocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(AppExecSocketGateway.name)

  constructor(private readonly appExecSocketService: AppExecSocketService) {}

  async handleConnection(socket: Socket): Promise<void> {
    try {
      await this.appExecSocketService.handleConnection(socket)
    } catch (error: unknown) {
      this.logger.error('AppExec socket connection error:', error)
      socket.disconnect()
    }
  }

  handleDisconnect(socket: Socket): void {
    this.appExecSocketService.handleDisconnect(socket)
  }

  @SubscribeMessage('exec:input')
  handleInput(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { input: string },
  ): void {
    this.appExecSocketService.handleInput(socket, data)
  }

  @SubscribeMessage('exec:resize')
  async handleResize(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { cols: number; rows: number },
  ): Promise<void> {
    await this.appExecSocketService.handleResize(socket, data)
  }
}
