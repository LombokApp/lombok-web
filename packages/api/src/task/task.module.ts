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
import { CoreTaskService } from './services/core-task.service'
import { TaskService } from './services/task.service'

@Global()
@Module({
  imports: [forwardRef(() => SocketModule), forwardRef(() => FoldersModule)],
  providers: [CoreTaskService, TaskService],
  controllers: [ServerTasksController, TasksController],
  exports: [CoreTaskService, TaskService],
})
export class TaskModule implements OnModuleInit, OnModuleDestroy {
  constructor(
    private readonly coreTaskService: CoreTaskService,
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
        '0,4,9,14,19,24,29,34,39,44,49,54,59 * * * * *',
        () => void this.coreTaskService.drainCoreTasks(),
        null,
        true,
      ),

      // every 5 seconds, broadcast to apps about pendng app tasks
      new CronJob(
        '0,4,9,14,19,24,29,34,39,44,49,54,59 * * * * *',
        () => this.taskService.notifyAllAppsOfPendingTasks(),
        null,
        true,
      ),
    ]
  }
}
