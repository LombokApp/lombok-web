# Workers, Docker Jobs and Tasks

A "worker" is a serverless worker, implemented as a JS/TS entrypoint included in an app bundle. A docker job is a named piece of work that can be executed by a specially constructed docker image, the configiuration of which is defined in the app config.json. A task is a user abstraction over the asynchronous execution of a worker or docker job, that allows for insight into, and orchestration of, the underlying worker/job logic.

Workers and docker jobs can both be executed synchronously or asynchronously, and in either case it's possible to chain them together, even mixing synchronous and asynchronous execution as well as mixing workers with docker jobs.

Execution chains can be defined at the triggering of the initial execution or, in the case of workers, constructed dynamically via the output of the execution itself.

