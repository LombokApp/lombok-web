# Lombok

## What is Lombok?

Lombok is a free, open-source and self-hostable storage and compute platform that runs on any S3-compatible storage service. Deploy on minimal hardware, sync your files, and run custom apps — all while keeping your data sovereign.

To learn more, visit the [public site](https://lombokapp.com) and read the [documentation](https://lombokapp.com/docs).

## Running for development

1. `bun install` -- install dependencies
2. `cp ./packages/api/.env.example ./packages/api/.env` -- copy the example env file
3. `bun minio:dev` -- run the dev minio container
4. `bun db:dev` -- run the db
5. `bun api:dev` -- run the backend
6. `bun ui:dev` -- run the ui
7. Add `lombok.localhost` and `minio` to your /etc/hosts file (pointing at 127.0.0.1)
8. Visit http://lombok.localhost:5173

### Other helpful commands

#### Backend

##### Run the API container after a fresh docker build

```
bun api:dev:build
```

##### Clean the db and restart the app

```
bun dev:restart:api:clean
```

##### Regenerate [openapi.json](packages/api/src/openapi.json) & [api-paths.d.ts](packages/types/src/api-paths.d.ts)

```
bun generate:openapi
```

##### Run E2E tests

###### Start the db + minio

```
bun --cwd ./packages/api dev:docker:e2e:services
```

###### Clean the tests db

```
bun --cwd ./packages/api dev:docker:e2e:down
```

###### Run all e2e tests

```
bun --cwd ./packages/api dev:docker:e2e:run
```

##### Building docker images

###### Standalone image (includes postgres)

```
bun build:standalone
```

###### Separate DB image (does not include postgres)

```
bun build:separate-db
```

#### Run linting/prettier/tsc checks

```
bun dev:tsc-all
```

```
bun dev:prettier-all
```

```
bun dev:lint-all
```

#### Run the demo app frontend in dev mode (in [@lombokapp/app-demo](./packages/app-demo))

1. `echo 'SC_APP_FRONTEND_PROXY_HOST_DEV_MAIN=http://localhost:5175' > ./packages/ui/.env.development.local` -- tell the UI to proxy frontend requests for the `main` frontend of the `dev` app to `http://localhost:5175`
2. `bun appuidemo:dev` -- run the demo app frontend
