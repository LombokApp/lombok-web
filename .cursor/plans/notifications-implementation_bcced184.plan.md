---
name: notifications-implementation
overview: Implement notifications and notification aggregation system as specified in the technical design document, including database schema changes, batching logic, two processors, and notification delivery system.
agentConfiguration:
  totalAgents: 6
  agents:
    - id: agent-1
      name: Database Schema Agent
      tasks: [task-1-db-schema]
      phase: 1
    - id: agent-2
      name: Core Utilities Agent
      tasks: [task-2-aggregation-config]
      phase: 1
    - id: agent-3
      name: Notification Processor Agent
      tasks: [task-3-create-processor]
      phase: 2
    - id: agent-4
      name: Delivery Processor Agent
      tasks: [task-4-delivery-processor]
      phase: 2
    - id: agent-5
      name: Settings & API Agent
      tasks: [task-6-settings-system, task-7-api-endpoints]
      phase: [2, 3]
    - id: agent-6
      name: Integration Agent
      tasks: [task-5-event-integration, task-8-module-integration]
      phase: [3, 4]
todos:
  - id: task-1-db-schema
    agent: agent-1
    content: "Database Schema Changes: Add aggregationKey/aggregationHandledAt to events table, create notifications/notification_deliveries/notification_settings tables with migrations"
    status: pending
    phase: 1
  - id: task-2-aggregation-config
    agent: agent-2
    content: "Aggregation Key Utility and Batching Config: Create aggregation key generation utility and static batching config per event type"
    status: pending
    phase: 1
  - id: task-3-create-processor
    agent: agent-3
    content: "CreateEventNotificationsProcessor: Implement processor that batches events and creates notifications with debounce/maxInterval logic"
    status: pending
    phase: 2
  - id: task-4-delivery-processor
    agent: agent-4
    content: "NotificationDeliveriesProcessor: Implement processor that creates channel-specific deliveries from notifications based on user settings"
    status: pending
    phase: 2
  - id: task-5-event-integration
    agent: agent-6
    content: "Event Emission Integration: Update event service to calculate aggregation keys and queue notification tasks when events are created"
    status: pending
    phase: 3
  - id: task-6-settings-system
    agent: agent-5
    content: "Notification Settings System: Implement settings CRUD and resolution logic (global + folder-specific overrides)"
    status: pending
    phase: 2
  - id: task-7-api-endpoints
    agent: agent-5
    content: "Notifications API Endpoints: Create REST API for listing, reading, marking read, and deleting notifications"
    status: pending
    phase: 3
  - id: task-8-module-integration
    agent: agent-6
    content: "Module Setup and Integration: Create NestJS module, wire up dependencies, register processors"
    status: pending
    phase: 4
isProject: false
---

# Notifications and Notification Aggregation Implementation Plan

## Overview

This plan implements a notification system that generates user-facing notifications from events with automatic batching (debounce + roll-up) per event type. The system uses the existing worker task system and provides atomic + idempotent guarantees.

## Agent Configuration Summary

**6 Agents** will execute this plan in **4 phases**:

- **Phase 1** (Parallel): Agent 1 (Database Schema) + Agent 2 (Core Utilities)
- **Phase 2** (Parallel, after Phase 1): Agent 3 (Notification Processor) + Agent 4 (Delivery Processor) + Agent 5 Part 1 (Settings)
- **Phase 3** (Parallel, after Phase 2): Agent 5 Part 2 (API) + Agent 6 Part 1 (Event Integration)
- **Phase 4** (Sequential, after Phase 3): Agent 6 Part 2 (Module Integration)

Each agent should update their assigned task sections with Results, Decisions, Context, and Blockers as they work.

## Architecture

The system consists of:

1. **Database Schema**: New tables for notifications and notification deliveries, plus fields on events table
2. **Batching Configuration**: Static config per event type defining debounce and max interval
3. **Aggregation Key System**: Deterministic key generation from event fields
4. **CreateEventNotificationsProcessor**: Processes unhandled events, applies batching rules, creates notifications
5. **NotificationDeliveriesProcessor**: Creates channel-specific deliveries (web/email/mobile) from notifications
6. **Event Emission Integration**: Queue notification tasks when events are created
7. **Notification Settings**: User and folder-level notification preferences
8. **API Endpoints**: CRUD operations for notifications

## Implementation Tasks

### Task 1: Database Schema Changes

**Agent**: Agent 1 (Database Schema Agent)
**Status**: `pending` → `in_progress` → `completed`
**Depends on**: None (Phase 1)
**Provides to**: All other agents (foundation)

**Files to modify/create**:

- `packages/api/src/event/entities/event.entity.ts` - Add `aggregationKey` and `aggregationHandledAt` fields
- `packages/api/src/notification/entities/notification.entity.ts` - Create new entity
- `packages/api/src/notification/entities/notification-delivery.entity.ts` - Create new entity
- `packages/api/src/notification/entities/notification-settings.entity.ts` - Create new entity
- `packages/api/src/orm/migrations/XXXX_notifications.sql` - Create migration file (use timestamp format like `0001_notifications.sql`)

**Details**:

- Add `aggregationKey: text | null` and `aggregationHandledAt: timestamp | null` to events table
- Create `notifications` table with: id (uuid), eventType (text), aggregationKey (text), targetLocationFolderId (uuid nullable), targetLocationObjectKey (text nullable), targetUserId (uuid nullable), eventIds (uuid[]), createdAt (timestamp), readAt (timestamp nullable)
- Create `notification_deliveries` table with: id (uuid), notificationId (uuid FK), userId (uuid FK), channel (text: 'web'|'email'|'mobile'), status (text: 'queued'|'sent'|'failed'), sentAt (timestamp nullable), failedAt (timestamp nullable), error (jsonb nullable), createdAt (timestamp)
- Create `notification_settings` table with: userId (uuid FK), eventType (text), channel (text), enabled (boolean), folderId (uuid nullable FK), createdAt (timestamp), updatedAt (timestamp)
- Add indexes:
  - `notifications_user_id_created_at_idx` on (targetUserId, createdAt DESC)
  - `notifications_aggregation_key_idx` on (aggregationKey)
  - `notification_deliveries_notification_id_idx` on (notificationId)
  - `notification_deliveries_user_id_idx` on (userId)
  - `notification_settings_user_id_event_type_idx` on (userId, eventType)
  - `notification_settings_folder_id_idx` on (folderId) WHERE folderId IS NOT NULL
- Add unique constraint: `notification_deliveries_notification_user_channel_unique` on (notificationId, userId, channel)
- Add unique constraint: `notification_settings_user_event_channel_folder_unique` on (userId, eventType, channel, COALESCE(folderId, '00000000-0000-0000-0000-000000000000'::uuid))
- Add foreign key constraints with appropriate ON DELETE behavior

**Shared Interface Provided**:

- Entity types exported from entity files
- Migration file ready to run

**Results**: *(Agent 1: Update after completion)*

- Files created/modified:
- Schema decisions:
- Index choices:
- Migration strategy:

## **Decisions**: *(Agent 1: Update after completion)*

## **Context**: *(Agent 1: Update after completion)*

## **Blockers**: *(Agent 1: Update if blocked)*

---

### Task 2: Aggregation Key Utility and Batching Config

**Agent**: Agent 2 (Core Utilities Agent)
**Status**: `pending` → `in_progress` → `completed`
**Depends on**: None (Phase 1)
**Provides to**: Agents 3, 4, 6 (core utilities)

**Files to create**:

- `packages/api/src/notification/util/aggregation-key.util.ts` - Generate deterministic aggregation keys
- `packages/api/src/notification/config/notification-batching.config.ts` - Static batching config per event type
- `packages/api/src/notification/config/notification-batching.config.types.ts` - TypeScript types for config

**Details**:

- Implement `buildAggregationKey(eventType: string, targetLocationFolderId: string | null, targetLocationObjectKey: string | null, targetUserId: string | null): string`
  - Creates deterministic key from: eventType, targetLocationFolderId, targetLocationObjectKey (hashed if present), targetUserId
  - Hash `targetLocationObjectKey` using crypto.createHash('sha256') for consistent length
  - Format: `eventType:folderId:hashedObjectKey:userId` (use empty string for null values, separate with colons)
  - Handle null/undefined values: convert to empty string or use special marker
- Create type: `NotificationBatchingConfig` with:
  - `notificationsEnabled: boolean`
  - `debounceSeconds: number` (>= 0)
  - `maxIntervalSeconds?: number` (>= 1, optional)
- Create static config object mapping `eventIdentifier: string` to `NotificationBatchingConfig`
- Export config lookup: `getNotificationBatchingConfig(eventIdentifier: string): NotificationBatchingConfig | null`
- Initial config: Start with empty config object (other agents can add entries later, or add a few example entries)

**Shared Interface Provided**:

```typescript
// From aggregation-key.util.ts
export function buildAggregationKey(
  eventType: string,
  targetLocationFolderId: string | null,
  targetLocationObjectKey: string | null,
  targetUserId: string | null
): string

// From notification-batching.config.ts
export interface NotificationBatchingConfig {
  notificationsEnabled: boolean
  debounceSeconds: number
  maxIntervalSeconds?: number
}
export function getNotificationBatchingConfig(
  eventIdentifier: string
): NotificationBatchingConfig | null
```

**Results**: *(Agent 2: Update after completion)*

- Files created:
- Key generation algorithm:
- Initial config values:

## **Decisions**: *(Agent 2: Update after completion)*

**Context**: *(Agent 2: Update after completion)*

- Edge cases handled:
- 

## **Blockers**: *(Agent 2: Update if blocked)*

---

### Task 3: CreateEventNotificationsProcessor

**Agent**: Agent 3 (Notification Processor Agent)
**Status**: `pending` → `in_progress` → `completed`
**Depends on**: Task 1 (schema), Task 2 (utilities) - Phase 2
**Provides to**: Agent 6 (integration)

**Files to create**:

- `packages/api/src/notification/processors/create-event-notifications.processor.ts` - Main processor logic
- `packages/api/src/notification/services/notification-batching.service.ts` - Batching logic service
- `packages/api/src/notification/services/notification.service.ts` - Notification CRUD operations

**Files to modify**:

- `packages/api/src/task/task.constants.ts` - Add `CreateEventNotifications` to CoreTaskName enum and CoreTaskData interface
- `packages/api/src/core-worker/core-worker.module.ts` - Register processor (NOTE: Agent 6 will handle module wiring)

**Details**:

- Extend `BaseCoreTaskProcessor<CoreTaskName.CreateEventNotifications>`
- Task payload type: `{ aggregationKey: string }`
- Processor logic:
  1. Read unhandled events for aggregation key (`aggregationHandledAt IS NULL` AND `aggregationKey = payload.aggregationKey`)
  2. Extract `eventType` from first event (all events in aggregation key have same eventType)
  3. Get batching config: `getNotificationBatchingConfig(eventType)`
  4. If `notificationsEnabled == false`, exit without requeue
  5. If no unhandled events, exit
  6. Calculate timestamps:
    - `lastUnhandledAt = MAX(createdAt)` where `aggregationHandledAt IS NULL`
    - `firstUnhandledAt = MIN(createdAt)` where `aggregationHandledAt IS NULL`
    - `latestHandled = MAX(aggregationHandledAt)` where `aggregationHandledAt IS NOT NULL` (or null if none)
  7. Apply batching rules:
    - If `debounceSeconds == 0`, flush immediately
    - If `debounceSeconds > 0`:
      - `quietFor = now - lastUnhandledAt`
      - If `quietFor < debounceSeconds`, requeue with `dontStartBefore = lastUnhandledAt + debounceSeconds` and exit
    - If `maxIntervalSeconds` set:
      - `age = now - firstUnhandledAt`
      - If `age >= maxIntervalSeconds`, flush regardless of debounce
  8. On flush (in transaction):
    - Collect all unhandled events (re-read to ensure fresh data)
    - Create notification record with: eventType, aggregationKey, targetLocationFolderId, targetLocationObjectKey, targetUserId, eventIds (array), createdAt = now
    - Update events: `UPDATE events SET aggregationHandledAt = now WHERE id IN (eventIds) AND aggregationHandledAt IS NULL`
    - Verify: `updatedRowCount === eventIds.length` (idempotency check)
    - If mismatch, throw error and requeue (another task may have processed some events)
    - Queue `NotificationDeliveriesProcessor` task(s) for created notification(s)
- Use database transactions for atomicity
- Handle idempotency: check updated row count matches expected
- Use `TaskService` to queue NotificationDeliveriesProcessor tasks

**Shared Interface Consumed**:

- `buildAggregationKey()` from Agent 2
- `getNotificationBatchingConfig()` from Agent 2
- Entity types from Agent 1

**Shared Interface Provided**:

- `NotificationService.createNotificationFromEvents(events: Event[], aggregationKey: string): Promise<Notification>`
- Processor class ready for registration

**Results**: *(Agent 3: Update after completion)*

- Files created/modified:
- Edge cases encountered:

**Decisions**: *(Agent 3: Update after completion)*

- Retry logic decisions:
- Transaction boundaries:

## **Context**: *(Agent 3: Update after completion)*

## **Blockers**: *(Agent 3: Update if blocked)*

---

### Task 4: NotificationDeliveriesProcessor

**Agent**: Agent 4 (Delivery Processor Agent)
**Status**: `pending` → `in_progress` → `completed`
**Depends on**: Task 1 (schema), Task 2 (utilities) - Phase 2
**Provides to**: Agent 6 (integration)

**Files to create**:

- `packages/api/src/notification/processors/notification-deliveries.processor.ts` - Delivery processor
- `packages/api/src/notification/services/notification-recipient.service.ts` - Determine relevant users
- `packages/api/src/notification/services/notification-delivery.service.ts` - Delivery CRUD operations

**Files to modify**:

- `packages/api/src/task/task.constants.ts` - Add `NotificationDeliveries` to CoreTaskName enum and CoreTaskData interface
- `packages/api/src/core-worker/core-worker.module.ts` - Register processor (NOTE: Agent 6 will handle module wiring)

**Details**:

- Extend `BaseCoreTaskProcessor<CoreTaskName.NotificationDeliveries>`
- Task payload type: `{ notificationId: string }`
- Processor logic:
  1. Load notification record by ID
  2. Determine `relevantUsers()` using `NotificationRecipientService.getRelevantUsers(notification)`:
    - Use `eventType`, `targetLocationFolderId`, `targetLocationObjectKey`, `targetUserId` from notification
    - Implement actor suppression: Need to determine actor from event data (may need to extract from eventIds or event data)
    - For folder events (`targetLocationFolderId` exists):
      - Include folder owner (from foldersTable)
      - Include users with folder shares (from folderSharesTable)
    - For user events (`targetUserId` exists):
      - Include target user
    - Return array of user IDs
  3. For each relevant user:
    - Load settings using `NotificationSettingsService.resolveSettings(userId, eventType, folderId)`:
      - Load global settings (folderId = null)
      - If `targetLocationFolderId` exists, load folder-specific overrides
      - Resolution order: folder-specific > global > defaults
      - Default: web=true, email=false, mobile=false
    - Determine enabled channels:
      - Web is always enabled
      - Email/mobile: check settings for eventType and channel
    - Create delivery records for enabled channels:
      - Use INSERT ... ON CONFLICT DO NOTHING or check-before-insert
      - Unique constraint: (notificationId, userId, channel)
      - Status: 'queued'
  4. Delivery records track: queued/sent/failed status (sent/failed handled by delivery workers later)
- Ensure idempotency: use unique constraint or check-before-insert pattern
- NOTE: Settings service will be created by Agent 5, but you can create a stub interface

**Shared Interface Consumed**:

- Entity types from Agent 1
- Settings service interface (Agent 5 will implement)

**Shared Interface Provided**:

- `NotificationRecipientService.getRelevantUsers(notification: Notification): Promise<string[]>` (user IDs)
- `NotificationDeliveryService.createDelivery(notificationId, userId, channel): Promise<NotificationDelivery>`
- Processor class ready for registration

**Results**: *(Agent 4: Update after completion)*

- Files created/modified:
- Recipient selection logic:

**Decisions**: *(Agent 4: Update after completion)*

- Settings resolution precedence:
- Actor suppression rules:

## **Context**: *(Agent 4: Update after completion)*

**Blockers**: *(Agent 4: Update if blocked)*

- May need to coordinate with Agent 5 on settings service interface
- 

---

### Task 5: Event Emission Integration

**Agent**: Agent 6 (Integration Agent) - Part 1
**Status**: `pending` → `in_progress` → `completed`
**Depends on**: Task 1, Task 2, Task 3 - Phase 3
**Provides to**: None (integration point)

**Files to create**:

- `packages/api/src/notification/services/notification-task-queue.service.ts` - Service to queue notification tasks

**Files to modify**:

- `packages/api/src/event/services/event.service.ts` - Update `_emitEventInTx` method

**Details**:

- Create `NotificationTaskQueueService`:
  - Method: `queueCreateEventNotificationsTask(aggregationKey: string, delayMs?: number): Promise<void>`
  - Creates task with:
    - `ownerIdentifier: CORE_IDENTIFIER`
    - `taskIdentifier: CoreTaskName.CreateEventNotifications`
    - `data: { aggregationKey }`
    - `dontStartBefore`: if delayMs provided, set to now + delayMs
    - Use `withTaskIdempotencyKey` with key format: `create-event-notifications:${aggregationKey}`
- Update `EventService._emitEventInTx`:
  - After event is created (line ~315):
    1. Calculate aggregation key: `buildAggregationKey(eventIdentifier, targetLocation?.folderId, targetLocation?.objectKey, targetUserId)`
    2. Get batching config: `getNotificationBatchingConfig(eventIdentifier)`
    3. If config exists and `notificationsEnabled === true`:
      - Update event: set `aggregationKey` and `aggregationHandledAt = NULL` (in same transaction)
      - Queue task: `notificationTaskQueueService.queueCreateEventNotificationsTask(aggregationKey)`
    4. Else (notifications disabled):
      - Set `aggregationKey = NULL` and `aggregationHandledAt = NULL`
- Ensure this happens within the existing transaction
- Inject `NotificationTaskQueueService` into `EventService`

**Shared Interface Consumed**:

- `buildAggregationKey()` from Agent 2
- `getNotificationBatchingConfig()` from Agent 2
- `CoreTaskName.CreateEventNotifications` from Agent 3

**Results**: *(Agent 6: Update after completion)*

- Files created/modified:
- Task queuing strategy:

**Decisions**: *(Agent 6: Update after completion)*

- Idempotency key format:
- Rate limiting considerations:

## **Context**: *(Agent 6: Update after completion)*

## **Blockers**: *(Agent 6: Update if blocked)*

---

### Task 6: Notification Settings System

**Agent**: Agent 5 (Settings & API Agent) - Part 1
**Status**: `pending` → `in_progress` → `completed`
**Depends on**: Task 1 (schema) - Phase 2
**Provides to**: Agent 4 (delivery processor), Agent 5 (API endpoints)

**Files to create**:

- `packages/api/src/notification/services/notification-settings.service.ts` - Settings CRUD and resolution
- `packages/api/src/notification/dto/notification-settings.dto.ts` - DTOs for settings API
- `packages/api/src/notification/controllers/notification-settings.controller.ts` - REST API endpoints

**Details**:

- Implement `NotificationSettingsService`:
  - `resolveSettings(userId: string, eventType: string, folderId: string | null): Promise<{ web: boolean, email: boolean, mobile: boolean }>`
    - Load global settings (folderId = null) for userId + eventType
    - If folderId provided, load folder-specific overrides
    - Resolution order: folder-specific > global > defaults
    - Defaults: web=true, email=false, mobile=false
  - `getUserSettings(userId: string): Promise<NotificationSetting[]>`
  - `updateUserSettings(userId: string, settings: NotificationSetting[]): Promise<void>`
  - `getFolderSettings(userId: string, folderId: string): Promise<NotificationSetting[]>`
  - `updateFolderSettings(userId: string, folderId: string, settings: NotificationSetting[]): Promise<void>`
- Create DTOs:
  - `NotificationSettingDTO`: `{ eventType: string, channel: 'web' | 'email' | 'mobile', enabled: boolean }`
  - Request/Response DTOs for API
- Create API endpoints:
  - `GET /api/notifications/settings` - Get user's global notification settings
  - `PUT /api/notifications/settings` - Update global settings (body: `NotificationSettingDTO[]`)
  - `GET /api/notifications/settings/folders/:folderId` - Get folder-specific settings
  - `PUT /api/notifications/settings/folders/:folderId` - Update folder-specific settings (body: `NotificationSettingDTO[]`)
- Use existing authentication patterns (see `FoldersController` for examples)
- Validate folder access for folder-specific endpoints

**Shared Interface Consumed**:

- Entity types from Agent 1

**Shared Interface Provided**:

- `NotificationSettingsService.resolveSettings(userId, eventType, folderId): Promise<ChannelSettings>`
- Settings CRUD methods
- Controller endpoints

**Results**: *(Agent 5: Update after completion)*

- Files created:
- Settings resolution logic:

**Decisions**: *(Agent 5: Update after completion)*

- API contract:
- Validation rules:

## **Context**: *(Agent 5: Update after completion)*

## **Blockers**: *(Agent 5: Update if blocked)*

---

### Task 7: Notifications API Endpoints

**Agent**: Agent 5 (Settings & API Agent) - Part 2
**Status**: `pending` → `in_progress` → `completed`
**Depends on**: Task 1 (schema), Task 6 (settings) - Phase 3
**Provides to**: None (user-facing API)

**Files to create**:

- `packages/api/src/notification/controllers/notifications.controller.ts` - REST API for notifications
- `packages/api/src/notification/dto/notification.dto.ts` - DTOs for notifications API
- `packages/api/src/notification/services/notification-query.service.ts` - Query service for listing notifications

**Details**:

- Create `NotificationQueryService`:
  - `listNotifications(userId: string, query: { cursor?, limit?, sort?, read?, eventType? }): Promise<{ notifications: Notification[], nextCursor? }>`
  - `getNotification(userId: string, notificationId: string): Promise<Notification>`
  - `markAsRead(userId: string, notificationId: string): Promise<void>`
  - `deleteNotification(userId: string, notificationId: string): Promise<void>`
  - `getUnreadCount(userId: string): Promise<number>`
- Create DTOs:
  - `NotificationDTO`: Include notification fields + delivery status per channel
  - Query params DTOs
- Create API endpoints:
  - `GET /api/notifications` - List user's notifications
    - Query params: `cursor` (string), `limit` (number, default 25), `sort` ('createdAt-asc'|'createdAt-desc'), `read` (boolean), `eventType` (string)
    - Returns: `{ notifications: NotificationDTO[], nextCursor?: string }`
  - `GET /api/notifications/:id` - Get single notification
  - `PATCH /api/notifications/:id/read` - Mark notification as read (sets `readAt = now`)
  - `DELETE /api/notifications/:id` - Delete notification (soft delete or hard delete)
  - `GET /api/notifications/unread-count` - Get count where `readAt IS NULL`
- Use existing authentication patterns
- Return notifications with delivery status for each channel (join with notification_deliveries)
- Pagination: Use cursor-based pagination (see existing patterns in codebase)

**Shared Interface Consumed**:

- Entity types from Agent 1
- Settings service from Task 6

**Results**: *(Agent 5: Update after completion)*

- Files created:
- API contract:

**Decisions**: *(Agent 5: Update after completion)*

- Pagination strategy:
- Performance optimizations:

## **Context**: *(Agent 5: Update after completion)*

## **Blockers**: *(Agent 5: Update if blocked)*

---

### Task 8: Module Setup and Integration

**Agent**: Agent 6 (Integration Agent) - Part 2
**Status**: `pending` → `in_progress` → `completed`
**Depends on**: All previous tasks - Phase 4
**Provides to**: None (final integration)

**Files to create**:

- `packages/api/src/notification/notification.module.ts` - NestJS module

**Files to modify**:

- `packages/api/src/orm/orm.service.ts` - Add notification tables to dbSchema export
- `packages/api/src/core/core.module.ts` - Import NotificationModule
- `packages/api/src/event/event.module.ts` - Import NotificationModule (for NotificationTaskQueueService)
- `packages/api/src/core-worker/core-worker.module.ts` - Import NotificationModule and register processors

**Details**:

- Create `NotificationModule`:
  - Import: `OrmModule`, `TaskModule`, `FoldersModule` (for folder access)
  - Providers: All services from Tasks 3, 4, 5, 6, 7
  - Controllers: `NotificationSettingsController`, `NotificationsController`
  - Processors: `CreateEventNotificationsProcessor`, `NotificationDeliveriesProcessor`
  - Exports: `NotificationTaskQueueService` (for EventModule), `NotificationSettingsService` (if needed)
- Update `OrmService.dbSchema`:
  - Add: `notificationsTable`, `notificationDeliveriesTable`, `notificationSettingsTable`
- Update `CoreModule`:
  - Import `NotificationModule`
- Update `EventModule`:
  - Import `NotificationModule` (forwardRef if circular dependency)
- Update `CoreWorkerModule`:
  - Import `NotificationModule`
  - Ensure processors are provided and will auto-register
- Resolve any circular dependencies using `forwardRef()` if needed
- Ensure all processors extend `BaseCoreTaskProcessor` and will auto-register

**Shared Interface Consumed**:

- All services, controllers, processors from all agents

**Results**: *(Agent 6: Update after completion)*

- Files created/modified:
- Module structure:

**Decisions**: *(Agent 6: Update after completion)*

- Dependency graph:
- Circular dependency resolutions:

## **Context**: *(Agent 6: Update after completion)*

## **Blockers**: *(Agent 6: Update if blocked)*

---

## Agent Assignments and Parallel Execution

### Agent Configuration

**Total Agents: 6**

- **Agent 1 (Database Schema)**: Task 1
- **Agent 2 (Core Utilities)**: Task 2  
- **Agent 3 (Notification Processor)**: Task 3
- **Agent 4 (Delivery Processor)**: Task 4
- **Agent 5 (Settings & API)**: Tasks 6 & 7
- **Agent 6 (Integration)**: Tasks 5 & 8

### Execution Phases

**Phase 1 (Start immediately - fully parallel)**:

- Agent 1: Database Schema Changes
- Agent 2: Aggregation Key Utility and Batching Config

**Phase 2 (Start after Phase 1 completes - parallel)**:

- Agent 3: CreateEventNotificationsProcessor (needs: Task 1, Task 2)
- Agent 4: NotificationDeliveriesProcessor (needs: Task 1, Task 2)
- Agent 5: Notification Settings System (needs: Task 1)

**Phase 3 (Start after Phase 2 completes - parallel)**:

- Agent 5: Notifications API Endpoints (needs: Task 1, Task 6)
- Agent 6: Event Emission Integration (needs: Task 1, Task 2, Task 3)

**Phase 4 (Start after Phase 3 completes)**:

- Agent 6: Module Setup and Integration (needs: All tasks)

### Shared Interfaces and Handoffs

**From Agent 1 (Database Schema)**:

- Entity files: `notification.entity.ts`, `notification-delivery.entity.ts`, `notification-settings.entity.ts`
- Migration file: `XXXX_notifications.sql`
- Updated: `event.entity.ts` with new fields

**From Agent 2 (Core Utilities)**:

- `buildAggregationKey(eventType, targetLocationFolderId, targetLocationObjectKey, targetUserId): string`
- `getNotificationBatchingConfig(eventIdentifier: string): NotificationBatchingConfig | null`
- Export from: `packages/api/src/notification/util/aggregation-key.util.ts`
- Export from: `packages/api/src/notification/config/notification-batching.config.ts`

**From Agent 3 (CreateEventNotificationsProcessor)**:

- Processor: `CreateEventNotificationsProcessor`
- Service: `NotificationService` with `createNotificationFromEvents()` method
- Task constant: `CoreTaskName.CreateEventNotifications`
- Queues: `NotificationDeliveriesProcessor` tasks after creating notifications

**From Agent 4 (NotificationDeliveriesProcessor)**:

- Processor: `NotificationDeliveriesProcessor`
- Service: `NotificationRecipientService` with `getRelevantUsers()` method
- Service: `NotificationSettingsService` with `resolveSettings()` method
- Task constant: `CoreTaskName.NotificationDeliveries`

**From Agent 5 (Settings & API)**:

- Settings service: `NotificationSettingsService` (CRUD operations)
- Settings controller: `NotificationSettingsController`
- Notifications controller: `NotificationsController`
- Query service: `NotificationQueryService`

**From Agent 6 (Integration)**:

- Task queue service: `NotificationTaskQueueService`
- Module: `NotificationModule`
- Integration points in: `EventService`, `CoreModule`, `OrmService`

## Agent Coordination Instructions

### Before Starting Work

1. **Claim your task**: Update the task status in the todos section from `pending` to `in_progress`
2. **Read dependencies**: Review all files listed in "Depends on" for your task
3. **Check shared interfaces**: Verify you understand the interfaces you'll consume from other agents

### During Implementation

1. **Follow existing patterns**: Review similar files (processors, services, entities) in the codebase
2. **Use shared interfaces**: Import and use functions/types from other agents' work as specified
3. **Handle missing dependencies gracefully**: If a dependency isn't ready, create a stub/interface and note it
4. **Update status frequently**: Update your task status and add progress notes

### After Completing Work

1. **Update task status**: Change from `in_progress` to `completed` in todos
2. **Document results**: Add a "Results" section below your task with:
  - Files created/modified
  - Key implementation decisions
  - Any deviations from the plan
  - Known limitations or TODOs
3. **Document decisions**: Add a "Decisions" section with:
  - Architectural choices made
  - Rationale for decisions
  - Alternatives considered
4. **Document context**: Add a "Context" section with:
  - Edge cases discovered
  - Gotchas or pitfalls
  - Performance considerations
  - Testing notes
5. **Report blockers**: If blocked, add a "Blockers" section and update status to `blocked`

### Communication Protocol

- **Check plan file first**: Before asking questions, check if another agent has already answered them
- **Update plan file**: All communication goes through this plan file - update your task section
- **Be explicit**: When creating shared interfaces, document function signatures, types, and usage examples
- **Coordinate on conflicts**: If you need to modify a file another agent is working on, note it in the plan

## Agent Instructions

Each agent should:

1. Read the technical design document: `event-notifications-technical-design.md`
2. Review existing code patterns in similar files (processors, services, entities)
3. Claim your task by updating status to `in_progress`
4. Implement your assigned task following existing code style and patterns
5. Add appropriate error handling and logging
6. Write unit tests for core logic (if time permits)
7. Update this plan file with Results, Decisions, Context, and Blockers sections
8. Mark task as `completed` when done

## Testing Strategy

After implementation:

1. Test aggregation key generation with various event combinations
2. Test batching logic with different debounce/maxInterval configurations
3. Test processor idempotency with retries
4. Test recipient selection logic
5. Test settings resolution (global + folder-specific)
6. Test API endpoints with various scenarios
7. Integration test: event → notification → delivery flow

## Notes

- Follow existing code patterns (see `AnalyzeObjectProcessor` for processor example)
- Use transactions for atomicity where specified
- Ensure idempotency at all levels (task queuing, notification creation, delivery creation)
- Hash `targetLocationObjectKey` for consistent aggregation key length
- Actor suppression: don't notify the user who performed the action (implement in recipient selection)
- Web notifications are always enabled; email/mobile depend on settings

