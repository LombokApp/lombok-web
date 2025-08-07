import {
  forwardRef,
  Global,
  Module,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common'
import { CronJob } from 'cron'
import { FoldersModule } from 'src/folders/folders.module'
import { SocketModule } from 'src/socket/socket.module'

import { ServerTasksController } from './controllers/server-tasks.controller'
import { TasksController } from './controllers/tasks.controller'
import { PlatformTaskService } from './services/platform-task.service'
import { TaskService } from './services/task.service'

@Global()
@Module({
  imports: [forwardRef(() => SocketModule), forwardRef(() => FoldersModule)],
  providers: [PlatformTaskService, TaskService],
  controllers: [ServerTasksController, TasksController],
  exports: [PlatformTaskService, TaskService],
})
export class TaskModule implements OnModuleInit, OnModuleDestroy {
  constructor(
    private readonly platformTaskService: PlatformTaskService,
    private readonly taskService: TaskService,
  ) {}

  jobs: CronJob[] | undefined = undefined

  onModuleDestroy() {
    this.jobs?.map((job) => job.stop())
  }

  onModuleInit() {
    // every 5 seconds, attempt to drain any pending core tasks
    this.jobs = [
      new CronJob(
        '*/5 * * * * *',
        () => void this.platformTaskService.drainPlatformTasks(),
        null,
        true,
      ),

      // every 5 seconds, broadcast to apps about pendng app tasks
      new CronJob(
        '*/5 * * * * *',
        () => this.taskService.handlePendingTasks(),
        null,
        true,
      ),
    ]
  }
}
