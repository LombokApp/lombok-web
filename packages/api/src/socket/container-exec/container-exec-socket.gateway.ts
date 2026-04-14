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

import { ContainerExecSocketService } from './container-exec-socket.service'

@WebSocketGateway({
  cors: {
    origin: '*', // TODO: constrain this (CHORE-04 will fix all gateways)
    allowedHeaders: [],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  namespace: /^\/container-exec\/[^/]+$/,
})
export class ContainerExecSocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(ContainerExecSocketGateway.name)

  constructor(
    private readonly containerExecSocketService: ContainerExecSocketService,
  ) {}

  async handleConnection(socket: Socket): Promise<void> {
    try {
      await this.containerExecSocketService.handleConnection(socket)
    } catch (error: unknown) {
      this.logger.error('ContainerExec socket connection error:', error)
      socket.disconnect()
    }
  }

  handleDisconnect(socket: Socket): void {
    this.containerExecSocketService.handleDisconnect(socket)
  }

  @SubscribeMessage('exec:input')
  handleInput(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { input: string },
  ): void {
    this.containerExecSocketService.handleInput(socket, data)
  }

  @SubscribeMessage('exec:resize')
  async handleResize(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { cols: number; rows: number },
  ): Promise<void> {
    await this.containerExecSocketService.handleResize(socket, data)
  }
}
