export enum PlatformTaskName {
  AnalyzeObject = 'analyze_object',
  ReindexFolder = 'reindex_folder',
  RunDockerWorker = 'run_docker_worker',
  RunServerlessWorker = 'run_serverless_worker',
}

export interface PlatformProcessorTaskData {
  [PlatformTaskName.AnalyzeObject]: {
    folderId: string
    objectKey: string
  }
  [PlatformTaskName.ReindexFolder]: {
    folderId: string
  }
  [PlatformTaskName.RunDockerWorker]: {
    appIdentifier: string
    profileIdentifier: string
    jobClassIdentifier: string
    innerTaskId: string
  }
  [PlatformTaskName.RunServerlessWorker]: {
    appIdentifier: string
    workerIdentifier: string
    innerTaskId: string
  }
}
