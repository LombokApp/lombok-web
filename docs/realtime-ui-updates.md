# Realtime UI updates

How the platform pushes backend changes to the web UI over Socket.IO so views
react without a page reload. This covers the event catalogue, room isolation, and
the implementation.

> Scope: the platform web UI (`/user` namespace). App iframes use a separate
> `/app-user` namespace with its own SDK (`@lombokapp/app-browser-sdk`) and are
> out of scope here except where noted.

---

## 1. The model in one paragraph

The backend publishes **one wire event** (`REALTIME_EVENT = 'event'`) carrying a
typed **envelope** `{ scope, event: { resource, action, id?, data }, ts, v }`. Each
envelope is delivered to exactly one Socket.IO **room** chosen by its `scope`
(`user` / `folder` / `server`). The client holds a single connection, fans every
envelope out to subscribers keyed by `event.resource`, and each subscriber maps it
to a TanStack Query reaction (refetch, "changes pending" banner, or cache patch).

Types live in `packages/types/src/realtime.types.ts`.

---

## 2. What gets pushed (event catalogue)

`resource:action` → which room → where it's emitted → how the UI reacts.

### Folder-scoped (`folder:{folderId}` room)

| Event | Emitted from | UI reaction |
|---|---|---|
| `folder.object:created/updated/removed` | `folders/services/folder.service.ts` (object upsert / delete / metadata update) | Folder grid: **pending banner** ("N changes — Refresh", preserves scroll). Folder metadata (object counts/empty-state): debounced invalidate. Object-detail screen: refetches the focused object on `updated`/`removed` matching its `objectKey`. |
| `folder.task:created` | `event/services/event.service.ts` (event-triggered task insert) | Folder tasks preview list: invalidate. Full tasks table: pending banner. |
| `folder.task:updated` | `task/services/task-update-broadcaster.service.ts` (lifecycle + throttled progress), `task/services/core-task.service.ts` (start/finish) | Task-detail screens: invalidate (`useTaskLiveUpdates`). Preview list: invalidate. Full table: pending banner. |
| `folder.event:created` | `event/services/event.service.ts` | Folder events preview list: invalidate. Full events table: pending banner. |

### User-scoped (`user:{userId}` room)

| Event | Emitted from | UI reaction |
|---|---|---|
| `user.notification:delivered` | `notification/processors/notification-deliveries.processor.ts` | Toast + invalidate notifications list & unread-count badge (`ServerContextProvider`). |
| `user.apps:changed` | `app/controllers/apps.controller.ts` (install/upgrade/enable/disable/uninstall) — **`broadcastAll`** | Invalidate app contributions → sidebar entrypoints + apps launcher refresh. Broadcast to all users because contributions affect everyone; payload is a non-sensitive "refetch" nudge only. |

### Server-scoped, admin only (`server` room)

| Event | Emitted from | UI reaction |
|---|---|---|
| `server.settings:updated` | `server/controllers/server.controller.ts` (set/reset setting) | Invalidate server settings (admins). |
| `server.task:updated` | `task/services/task-update-broadcaster.service.ts` | Server tasks table: pending banner. |
| `server.event:created` | `event/services/event.service.ts` — **throttled** via `nudgeServer` | Server events table: pending banner. |
| `server.log:created` | `log/services/log-entry.service.ts` — **throttled** via `nudgeServer` | Server logs table: pending banner. |
| `server.app:installed/enabled/disabled/updated/uninstalled` | `app/controllers/apps.controller.ts` | Emitted now; admin apps list/detail consumption is a follow-up. |

**Declared but not yet emitted** (reserved in the union for upcoming work):
`server.user:*`, `server.session:*`, `server.docker.*`, and the `folder.comment:*`
and `user.folder:*` (starred/created/removed) families. Adding them is an emit +
a `useLiveQuery` — no protocol change.

### Volume controls

High-frequency streams are throttled at the source so a busy system doesn't flood
clients:

- **Task progress** — `task-update-broadcaster.service.ts` coalesces `task_progress`
  per task on a ~300 ms trailing window. Terminal states (completed/failed) bypass
  it and flush immediately.
- **Server events & logs** — `RealtimeService.nudgeServer(event, { key, intervalMs })`
  emits at most once per second per key. These are the highest-volume streams, so
  the server room gets a throttled "tail changed" nudge rather than a per-item
  firehose; the client refetches the list on the nudge.

Folder object bursts (e.g. bulk ingest) are currently absorbed on the **client**
(the grid's pending banner doesn't refetch per event; metadata invalidation is
debounced). Backend per-folder coalescing for object events is a noted follow-up.

---

## 3. Room isolation — limiting wasteful delivery

Delivery is scoped by Socket.IO rooms, so most messages never reach clients that
don't need them. Three room types on `/user`:

| Room | Members | Joined | Left | Authorization |
|---|---|---|---|---|
| `user:{userId}` | just that user | at connect (auto) | disconnect | user JWT |
| `folder:{folderId}` | users **currently viewing** that folder | on demand | on leaving the folder | **ACL-gated** (`folderService.getFolderAsUser`) |
| `server` | admins | at connect (auto, if `isAdmin`) | disconnect | DB `isAdmin` re-read at connect |

### Folder rooms are route-scoped and access-gated

A folder's events reach **only users who are both (a) currently on that folder's
route and (b) authorized for it** — the scoping is at the wire, not client-side
filtering. Lifecycle:

1. Navigate to any `/folders/:folderId/*` route → `FolderRoot` mounts
   `FolderContextProvider` for that folder (`pages/folders/folder-root.tsx`).
2. The provider calls `useRealtimeRoom(folderId)` → the client emits
   `subscribe { folderId }`.
3. Server `UserSocketService.subscribeFolderScope` runs the folder ACL check and
   only then `socket.join('folder:{folderId}')`. No access → `subscribe_error`,
   no join.
4. Navigate away → provider unmounts → client emits `unsubscribe` →
   `socket.leave(...)`.

So you receive a folder's (numerous) object/task/event updates **only while
looking at it**, and never for folders you can't access. Room membership doubles
as an authorization boundary — `scope` on the envelope is for client routing only,
never trusted.

Joins are **ref-counted**: multiple components wanting the same folder subscribe
once and unsubscribe only when the last unmounts. On reconnect the provider
replays `subscribe` for every room it still holds (membership is lost across a
disconnect).

### User room — always on, for personal events

You're in `user:{userId}` for the whole session, so notifications and your own
task updates reach you regardless of route. Low volume, intentional.

### Server room — coarser, mitigated

Admins join `server` for the **whole session** at connect, not per admin route. So
a connected admin receives `server.*` traffic even when not on the relevant page.
Two things keep this cheap:

1. **Source throttling** — `server.event`/`server.log` are coalesced to ≤1/sec
   (`nudgeServer`); `server.task` rides the already-throttled progress path.
2. **Client drops unwatched resources** — the provider only fans out to mounted
   subscribers. If you're not on the logs page, nothing subscribes to `server.log`,
   so those envelopes arrive and are discarded with zero work.

Trade-off vs. folders: an admin pays the (throttled) wire cost for server events
anywhere in the app, whereas folder events cost nothing off-route. Route-scoping
the `server` room is possible but deliberately deferred — the throttle bounds it.

---

## 4. Implementation

### Backend (`packages/api`, `packages/types`)

| File | Role |
|---|---|
| `packages/types/src/realtime.types.ts` | `REALTIME_EVENT`, `RealtimeScope`, the closed `RealtimeEvent` union, `RealtimeEnvelope`. `data` is loosely typed (`JsonSerializableObject`) except `folder.object` (typed from `folderObjectSchema`) and `user.notification`. |
| `socket/realtime.service.ts` | The emitter every domain service/controller uses: `toUser` / `toFolder` / `toServer` / `broadcastAll` / `nudgeServer`. Stamps `ts` (Node clock) + `v`. |
| `socket/user/user-socket.service.ts` | `authenticateSocket` (JWT + DB `isAdmin` re-read), room joins (`user` + `server`), ACL-gated folder `subscribe`/`unsubscribe`, `emitEnvelope`/`broadcastEnvelope`, `scopeToRoom`. |
| `socket/user/user-socket.gateway.ts` | Auth runs as namespace middleware (`namespace.use` → `authenticateSocket`) so `socket.data` is set before the client `connect` fires — an eager `subscribe` can't lose a race with the connect-time DB read. `handleConnection` then does the room joins; `@SubscribeMessage('subscribe'|'unsubscribe')` handlers. |
| Emit sites | `folders/services/folder.service.ts`, `event/services/event.service.ts`, `task/services/core-task.service.ts`, `task/services/task-update-broadcaster.service.ts`, `notification/processors/notification-deliveries.processor.ts`, `log/services/log-entry.service.ts`, `app/controllers/apps.controller.ts`, `server/controllers/server.controller.ts`. |

`RealtimeService` is provided/exported by `SocketModule`; inject it via
`forwardRef` in feature services or plainly in controllers. Settings/apps events
are emitted from **controllers** (not services) to avoid service-layer DI cycles.
The `server` room admin check re-reads `isAdmin` from the DB at connect rather than
trusting the JWT (admin can be revoked mid-session) — mirrors `AuthGuard`.

Wire-level delivery + auth is covered by `socket/user/tests/user-socket.e2e-spec.ts`:
connection auth, user/folder/server room routing and isolation, the folder
ACL gate (owner / share / no-access), and admin-only `server` delivery.

### Frontend (`packages/ui`)

| File | Role |
|---|---|
| `src/contexts/realtime/realtime.provider.tsx` | Single reconnecting `/user` socket (mounted once in `App.tsx`). Ref-counted resource listeners + folder rooms; replays rooms and bumps `reconnectCount` on (re)connect. |
| `src/contexts/realtime/use-live-query.tsx` | `useLiveQuery({ resources, match?, mode, queryKey?, patch?, ... })` — the core primitive. Modes: **`invalidate`** (debounced refetch), **`pending`** (count only + manual `apply()` → drives banners), **`patch`** (`setQueryData`, available, not yet used). Built-in debounce/coalesce + reconnect resync. |
| `src/contexts/realtime/realtime.hooks.ts` | `useRealtime`, `useRealtimeEvent(resource, handler)`, `useRealtimeRoom(folderId)`. |
| `src/components/live-updates-banner/` | `LiveUpdatesBanner` (pause/resume + "N changes — Refresh") and `LiveTableBanner` (drop-in pending-mode banner for paginated tables). |
| `src/hooks/use-task-live-updates.tsx` | Thin `useLiveQuery` wrapper for task detail views. |
| `src/hooks/use-dirty-aware-refresh.tsx` | Holds incoming server data while a form is dirty and shows a "record changed — reload / keep my changes" prompt instead of clobbering edits. |
| `packages/utils/src/debounce.util.ts` | `debounce(fn, waitMs, { maxWait })`. |

Consumers: `ServerContextProvider` (apps/settings/notifications), `FolderContextProvider`
(folder room + metadata), the folder object grid and the folder/server
task·event·log table screens (pending banner), object-detail (focused refetch),
and the MCP-permissions and storage-provision forms (dirty-aware refresh).

### Reaction modes — when to use which

- **invalidate** — detail views and small/unscrolled lists. Cheap, debounced.
- **pending** — large or scrolled lists, and admin tables with URL-driven
  filter/sort/page state. Never auto-refetches (preserves the user's place);
  surfaces a banner and refetches only on click.
- **patch** — single-item add/update/remove whose full record rides in `data`.
  Available in the primitive; not currently wired (the folder grid uses `pending`
  because its virtualized store made surgical patching risky — see the framework
  memory note).

---

## 5. Adding a new realtime update

1. **Backend** — call the emitter at the mutation site:
   `realtimeService.toFolder(folderId, { resource: 'folder.x', action: 'updated', id, data })`
   (or `toUser`/`toServer`/`broadcastAll`). For high-frequency streams use
   `nudgeServer`. If the `resource` is new, add it to the `RealtimeEvent` union in
   `realtime.types.ts`.
2. **Frontend** — in the view, either:
   - `useLiveQuery({ resources: ['folder.x'], match, queryKey, mode: 'invalidate' })`, or
   - drop a `<LiveTableBanner resources={['server.x']} queryKey={…} />` for paginated tables, or
   - `useRealtimeEvent('resource', handler)` for a bespoke side effect (e.g. a toast).
3. For folder-scoped events, filter with `match: (e) => e.scope.kind === 'folder' && e.scope.folderId === folderId` so unrelated folder rooms don't trigger work.

---

## 6. Known gaps / follow-ups

- Light up the remaining admin surfaces: Apps, Users (+ sessions), Docker
  hosts/containers/jobs/stats (`server.*` emits exist or are reserved).
- Comments (`folder.comment`), starred folders + folders list (`user.folder.*`).
- Backend per-folder coalescing for bulk object ingestion.
- Opt-in per-view **log tailing** (NDJSON stream, like `bridge-log-stream`) —
  distinct from the throttled list nudge.
- The `server` room is session-scoped, not route-scoped (see §3).
