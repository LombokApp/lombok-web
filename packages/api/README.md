# Stellaris cloud API

- [Stellaris cloud API](#stellaris-cloud-api)
  - [Getting started](#getting-started)
  - [Package Scripts](#package-scripts)
    - [Docker Compose](#docker-compose)
  - [Environment Vars](#environment-vars)
  - [DB Migrations](#db-migrations)
    - [Migration Creation Process](#migration-creation-process)
  - [API Routes](#api-routes)
    - [Authn \& Authz](#authn--authz)
    - [API Documentation](#api-documentation)

## Getting started

1. Start database and initialize the database.

   ```sh
   docker compose up -d db
   docker compose run --rm api db:reset
   docker compose run --rm api db:seed:dev
   ```

   or

   ```sh
   docker compose up -d db
   CMD_ENV=dev yarn workspace @stellariscloud/api db:reset
   CMD_ENV=dev yarn workspace @stellariscloud/api db:seed:dev
   ```

2. Start the dev server.

   ```sh
   yarn workspace @stellariscloud/api dev:docker
   ```

## Package Scripts

- `build`: Build and emit production build artifact to `/dist`
- `generate-client`: Regenerate the `@stellariscloud/api-client` package used by frontend packages.

### Docker Compose

Scripts can be run locally using `yarn`, or in a container using Docker Compose. Docker Compose offers a more consistent experience but is slower than running the dev server locally (especially with Docker Desktop on macOS).

```sh
# docker
docker compose run --rm api build
```

```sh
# local
CMD_ENV=dev yarn workspace @stellariscloud/api build
```

## Environment Vars

Environment var are populated automatically when using Docker Compose but must be set explicitly when running scripts using `yarn`.

Scripts run with `yarn` will load environment vars from a matching `/env/${CMD_ENV}.env` file if the `CMD_ENV` var is set:

```sh
# load /env/dev.env
CMD_ENV=dev yarn workspace @stellariscloud/api dev
```

```sh
# load /env/test.env
CMD_ENV=test yarn workspace @stellariscloud/api test
```

## DB Migrations

DB migrations are managed using [Drizzle])(https://orm.drizzle.team/).

Drizzle generates new migrations automatically by diffing the schema defined in the codebase against the last known state.

Files matching the pattern `src/**/*.entity.ts` are automatically loaded by Drizzle to parse entity definitions.

### Migration Creation Process

1. Run any pending migrations. This is necessary to ensure that the new changes are based on the latest existing migration.

   ```sh
   # docker
   docker compose run --rm api db:migrate:up
   ```

   ```sh
   # local
   CMD_ENV=dev yarn workspace @stellariscloud/api db:migrate:up
   ```

2. Update or create new orm entities.

3. Generate a new migration file.

   ```sh
   # docker
   docker compose run --rm api db:migrate:new
   ```

   ```sh
   # local
   CMD_ENV=dev yarn workspace @stellariscloud/api db:migrate:new
   ```

4. Update the new migration file. (Clean up the SQL formatting, add a `down` implementation.)

5. Run the new migration.

   ```sh
   # docker
   docker compose run --rm api db:migrate:up
   ```

   ```sh
   # local
   CMD_ENV=dev yarn workspace @stellariscloud/api db:migrate:up
   ```

6. Confirm that the result of the new migration matches the parsed entity schema that a new migration can't be generated.

   Running `db:migrate:new` again should return "No changes required, schema is up-to-date" if everything is correct.

## API Routes

This project uses [tsoa](https://tsoa-community.github.io/docs/) to manage API routing, request validation, and OpenAPI doc generation.

tsoa generates a set of API routes at `src/generated/routes.ts` during build that is imported and mounted in the express app in `src/app.ts`.

Files matching the pattern `src/**/*.controller.ts` are automatically loaded by tsoa to parse API route definitions.

### Authn & Authz

Authentication is handled as express middleware defined in `src/auth/express-authentication.ts` and authorization is defined at the controller or route level with the `@Security()` decorator from tsoa (see https://tsoa-community.github.io/docs/authentication.html).

### API Documentation

OpenAPI documentation is generated automatically from the types, `jsdoc` comments, and decorators on the defined controllers and routes at `src/generated/swagger.json`.
