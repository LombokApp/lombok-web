CREATE TABLE "app_folder_settings" (
	"folderId" uuid NOT NULL,
	"appIdentifier" text NOT NULL,
	"enabled" boolean,
	"permissions" jsonb,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_user_settings" (
	"userId" uuid NOT NULL,
	"appIdentifier" text NOT NULL,
	"enabled" boolean,
	"folderScopeEnabledDefault" boolean,
	"folderScopePermissionsDefault" jsonb,
	"permissions" jsonb,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "apps" (
	"identifier" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"label" text NOT NULL,
	"publicKey" text NOT NULL,
	"requiresStorage" boolean NOT NULL,
	"subscribedCoreEvents" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"implementedTasks" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"contentHash" text NOT NULL,
	"config" jsonb NOT NULL,
	"userScopeEnabledDefault" boolean NOT NULL,
	"folderScopeEnabledDefault" boolean NOT NULL,
	"permissions" jsonb DEFAULT '{"core":[],"user":[],"folder":[]}'::jsonb NOT NULL,
	"runtimeWorkers" jsonb NOT NULL,
	"ui" jsonb NOT NULL,
	"database" boolean DEFAULT false NOT NULL,
	"manifest" jsonb NOT NULL,
	"containerProfiles" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" uuid PRIMARY KEY NOT NULL,
	"hash" text NOT NULL,
	"userId" uuid NOT NULL,
	"type" text NOT NULL,
	"typeDetails" jsonb,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_identities" (
	"id" uuid PRIMARY KEY NOT NULL,
	"userId" uuid NOT NULL,
	"provider" text NOT NULL,
	"providerUserId" text NOT NULL,
	"providerEmail" text,
	"providerName" text,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL,
	CONSTRAINT "unique_provider_user" UNIQUE("provider","providerUserId"),
	CONSTRAINT "unique_user_provider" UNIQUE("userId","provider")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"eventIdentifier" text NOT NULL,
	"emitterIdentifier" text NOT NULL,
	"targetUserId" uuid,
	"targetLocationFolderId" uuid,
	"targetLocationObjectKey" text,
	"data" jsonb,
	"createdAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "folder_objects" (
	"id" uuid PRIMARY KEY NOT NULL,
	"objectKey" text NOT NULL,
	"filename" text NOT NULL,
	"eTag" text NOT NULL,
	"sizeBytes" bigint NOT NULL,
	"lastModified" bigint NOT NULL,
	"hash" text,
	"contentMetadata" jsonb NOT NULL,
	"folderId" uuid NOT NULL,
	"mimeType" text NOT NULL,
	"mediaType" text NOT NULL,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "folder_shares" (
	"folderId" uuid NOT NULL,
	"userId" uuid NOT NULL,
	"permissions" text[] NOT NULL,
	"createdAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "folders" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"contentLocationId" uuid NOT NULL,
	"metadataLocationId" uuid NOT NULL,
	"ownerId" uuid NOT NULL,
	"accessError" jsonb,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "log_entries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"message" text NOT NULL,
	"emitterIdentifier" text NOT NULL,
	"targetLocationFolderId" uuid,
	"targetLocationObjectKey" text,
	"level" text NOT NULL,
	"data" jsonb,
	"createdAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "server_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "storage_locations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"accessKeyHashId" text NOT NULL,
	"providerType" text NOT NULL,
	"label" text NOT NULL,
	"endpoint" text NOT NULL,
	"endpointDomain" text NOT NULL,
	"region" text NOT NULL,
	"accessKeyId" text NOT NULL,
	"secretAccessKey" text NOT NULL,
	"bucket" text NOT NULL,
	"prefix" text NOT NULL,
	"userId" uuid NOT NULL,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ownerIdentifier" text NOT NULL,
	"taskIdentifier" text NOT NULL,
	"taskDescription" text NOT NULL,
	"data" jsonb NOT NULL,
	"invocation" jsonb NOT NULL,
	"idempotencyKey" text NOT NULL,
	"targetUserId" uuid,
	"targetLocationFolderId" uuid,
	"targetLocationObjectKey" text,
	"startedAt" timestamp,
	"completedAt" timestamp,
	"attemptCount" integer DEFAULT 0 NOT NULL,
	"failureCount" integer DEFAULT 0 NOT NULL,
	"dontStartBefore" timestamp,
	"systemLog" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"taskLog" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"storageAccessPolicy" jsonb NOT NULL,
	"success" boolean,
	"userVisible" boolean DEFAULT true,
	"error" jsonb,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL,
	"handlerType" text NOT NULL,
	"handlerIdentifier" text,
	CONSTRAINT "tasks_idempotencyKey_unique" UNIQUE("idempotencyKey")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"isAdmin" boolean DEFAULT false NOT NULL,
	"name" text,
	"username" text NOT NULL,
	"email" text,
	"emailVerified" boolean DEFAULT false NOT NULL,
	"permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"passwordHash" text,
	"passwordSalt" text,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "app_folder_settings" ADD CONSTRAINT "app_folder_settings_folderId_folders_id_fk" FOREIGN KEY ("folderId") REFERENCES "public"."folders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_folder_settings" ADD CONSTRAINT "app_folder_settings_appIdentifier_apps_identifier_fk" FOREIGN KEY ("appIdentifier") REFERENCES "public"."apps"("identifier") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_user_settings" ADD CONSTRAINT "app_user_settings_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_user_settings" ADD CONSTRAINT "app_user_settings_appIdentifier_apps_identifier_fk" FOREIGN KEY ("appIdentifier") REFERENCES "public"."apps"("identifier") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_identities" ADD CONSTRAINT "user_identities_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "folder_shares" ADD CONSTRAINT "folder_shares_folderId_folders_id_fk" FOREIGN KEY ("folderId") REFERENCES "public"."folders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "folders" ADD CONSTRAINT "folders_contentLocationId_storage_locations_id_fk" FOREIGN KEY ("contentLocationId") REFERENCES "public"."storage_locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "folders" ADD CONSTRAINT "folders_metadataLocationId_storage_locations_id_fk" FOREIGN KEY ("metadataLocationId") REFERENCES "public"."storage_locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "folders" ADD CONSTRAINT "folders_ownerId_users_id_fk" FOREIGN KEY ("ownerId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storage_locations" ADD CONSTRAINT "storage_locations_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "app_folder_settings_folder_id_idx" ON "app_folder_settings" USING btree ("folderId");--> statement-breakpoint
CREATE UNIQUE INDEX "app_folder_settings_folder_app_unique" ON "app_folder_settings" USING btree ("folderId","appIdentifier");--> statement-breakpoint
CREATE INDEX "app_user_settings_user_id_idx" ON "app_user_settings" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "app_user_settings_user_app_unique" ON "app_user_settings" USING btree ("userId","appIdentifier");--> statement-breakpoint
CREATE INDEX "events_target_location_folder_id_idx" ON "events" USING btree ("targetLocationFolderId");--> statement-breakpoint
CREATE INDEX "folder_objects_folder_id_media_type_size_bytes_idx" ON "folder_objects" USING btree ("folderId","sizeBytes","mediaType");--> statement-breakpoint
CREATE INDEX "folder_objects_folder_id_media_type_idx" ON "folder_objects" USING btree ("folderId","mediaType");--> statement-breakpoint
CREATE UNIQUE INDEX "folder_objects_folder_id_object_key_unique" ON "folder_objects" USING btree ("folderId","objectKey");--> statement-breakpoint
CREATE INDEX "user_idx" ON "folder_shares" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "folder_user_unique" ON "folder_shares" USING btree ("folderId","userId");--> statement-breakpoint
CREATE INDEX "log_entries_target_location_folder_id_idx" ON "log_entries" USING btree ("targetLocationFolderId");--> statement-breakpoint
CREATE INDEX "tasks_trigger_kind_idx" ON "tasks" USING btree (("invocation" ->> 'kind'));--> statement-breakpoint
CREATE INDEX "tasks_idempotency_key_idx" ON "tasks" USING btree ("ownerIdentifier","taskIdentifier","idempotencyKey");--> statement-breakpoint
CREATE INDEX "tasks_target_location_folder_id_idx" ON "tasks" USING btree ("targetLocationFolderId");--> statement-breakpoint
CREATE INDEX "tasks_target_location_folder_id_object_key_idx" ON "tasks" USING btree ("targetLocationFolderId","targetLocationObjectKey");