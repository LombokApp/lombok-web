import { io } from 'socket.io-client'
import { buildAppClient } from '@stellariscloud/app-worker-sdk'
;(async () => {
  console.log('process.argv:', process.argv)
  console.log('process.env:', process.env)
  const workerStartContext = JSON.parse(process.argv[2])
  console.log('WORKER START CONTEXT:', workerStartContext)
  let userModule
  try {
    userModule = await import(workerStartContext.scriptPath)
  } catch (err) {
    console.error('Failed to import user script:', err)
    process.exit(1)
  }

  // Try named export first, then default export
  const mainFn = userModule.main || userModule.default
  if (typeof mainFn !== 'function') {
    console.error('User script does not export a main function.')
    process.exit(1)
  }

  try {
    console.log(
      'START SCRIPT EXECUTING !#!#!',
      Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15),
    )
    const socket = io(`${workerStartContext.serverBaseUrl}/apps`, {
      auth: {
        appWorkerId: `worker-script--${workerStartContext.workerIdentifier}--${workerStartContext.executionId}`,
        token: workerStartContext.workerToken,
      },
      reconnection: false,
    })
    const serverClient = buildAppClient(
      socket,
      workerStartContext.serverBaseUrl,
    )
    await mainFn(serverClient)
    console.log(
      'FINISH SCRIPT EXECUTING !#!#!',
      Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15),
    )

    process.exit(0)
  } catch (err) {
    console.error('Error running user script main():', err)
    process.exit(1)
  }
})()
