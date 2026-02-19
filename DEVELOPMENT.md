# Running for development

1. `bun install` -- install dependencies
2. `./dx up` -- build and start the dev container (includes backend, frontend, PostgreSQL, and MinIO)
3. Add `lombok.localhost` to your /etc/hosts file (pointing at 127.0.0.1)
4. Visit <http://localhost:5173>

Everything runs inside a single Docker container. The dev entrypoint automatically starts PostgreSQL, MinIO, the Vite frontend dev server (port 5173), and the NestJS backend (port 3000).

After the first build, `./dx up` starts without rebuilding.

## Dev CLI (`./dx`)

Run `./dx` or `./dx help` to see all available commands. Most commands execute inside the running container.

```bash
./dx reload api           # Reload the NestJS API (triggers bun watch reload)
./dx restart api          # Fully restart the NestJS API (loads new env)
./dx restart ui           # Restart the Vite frontend dev server
./dx db seed              # Seed the database with dev data
./dx db reset             # Drop all tables and re-migrate
./dx db reset:seed        # Drop all tables, re-migrate, and re-seed
./dx db purge             # Drop all tables and schemas
./dx db migrate           # Run pending database migrations
./dx db migrate:new       # Generate a new migration
./dx unit <package>       # Run unit tests for a package
./dx e2e api              # Run API end-to-end tests
./dx e2e ui               # Run UI end-to-end tests
./dx e2e core-worker      # Run core worker end-to-end tests
./dx e2e down             # Stop the e2e container (docker compose down)
./dx e2e kill             # Force-kill the e2e container
./dx e2e purge            # Tear down and remove all e2e docker resources
./dx generate openapi     # Generate the OpenAPI spec
./dx generate metadata    # Generate NestJS metadata
./dx shell                # Open a shell inside the container
./dx logs                 # Tail the container logs
./dx exec <cmd...>        # Run an arbitrary command inside the container
```

## App Container lifecycle

```bash
./dx up                   # Start the dev environment (docker compose up)
./dx up -d                # Start in detached/daemon mode
./dx down                 # Stop the dev environment (docker compose down)
./dx kill                 # Force-kill the dev environment
./dx install              # Force-reinstall deps on host and in container
./dx purge db             # Tear down and remove the Postgres data volume
./dx purge minio          # Tear down and remove the MinIO data volume
./dx purge all            # Tear down and remove all volumes, images, and orphans
```

## Code checks

```bash
./dx check all            # Run prettier, tsc, and eslint across all packages
./dx check lint           # Run eslint across all packages
./dx check prettier       # Run prettier across all packages
./dx check tsc            # Run tsc across all packages
```

## Environment

Dev environment variables are defined inline in `docker-compose.yml`. No `.env` file is needed for the standard dev setup, but one can be used to override specific env vars in the docker compose (check that file to see which ones).

The `DEV_SEED_FILE` env var controls which seed file runs on first startup (default: `default.ts`). Set it to `none` to skip seeding. Seed files live in `packages/api/script/db-seeds/`.

## Building release images

### Standalone image (includes postgres)

```bash
./dx release standalone
```

### Separate DB image (does not include postgres)

```bash
./dx release separate-db
```
