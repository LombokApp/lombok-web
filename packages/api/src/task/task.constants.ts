export enum CoreTaskName {
  AnalyzeObject = 'analyze_object',
  ReindexFolder = 'reindex_folder',
  RunDockerWorker = 'run_docker_worker',
  RunServerlessWorker = 'run_serverless_worker',
}

export interface CoreTaskData {
  [CoreTaskName.AnalyzeObject]: {
    folderId: string
    objectKey: string
  }
  [CoreTaskName.ReindexFolder]: {
    folderId: string
  }
  [CoreTaskName.RunDockerWorker]: {
    appIdentifier: string
    profileIdentifier: string
    jobClassIdentifier: string
    innerTaskId: string
  }
  [CoreTaskName.RunServerlessWorker]: {
    appIdentifier: string
    workerIdentifier: string
    innerTaskId: string
  }
}
