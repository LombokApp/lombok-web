CREATE TABLE "apps" (
	"identifier" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"publicKey" text NOT NULL,
	"requiresStorage" boolean NOT NULL,
	"subscribedEvents" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"implementedTasks" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"contentHash" text NOT NULL,
	"config" jsonb NOT NULL,
	"workerScripts" jsonb NOT NULL,
	"uis" jsonb NOT NULL,
	"manifest" jsonb NOT NULL,
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
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"eventKey" text NOT NULL,
	"emitterIdentifier" text NOT NULL,
	"userId" text,
	"subjectFolderId" uuid,
	"subjectObjectKey" text,
	"data" jsonb,
	"createdAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "folder_objects" (
	"id" uuid PRIMARY KEY NOT NULL,
	"objectKey" text NOT NULL,
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
	"createdAt" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "folders" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"contentLocationId" uuid NOT NULL,
	"metadataLocationId" uuid NOT NULL,
	"ownerId" uuid NOT NULL,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "log_entries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"message" text NOT NULL,
	"emitterIdentifier" text NOT NULL,
	"subjectFolderId" uuid,
	"level" text NOT NULL,
	"subjectObjectKey" text,
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
	"inputData" jsonb NOT NULL,
	"updates" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"triggeringEventId" uuid NOT NULL,
	"handlerId" text,
	"subjectFolderId" uuid,
	"subjectObjectKey" text,
	"startedAt" timestamp,
	"completedAt" timestamp,
	"errorAt" timestamp,
	"errorCode" text,
	"errorMessage" text,
	"errorDetails" jsonb,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL,
	"workerIdentifier" text
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
	"passwordHash" text NOT NULL,
	"passwordSalt" text NOT NULL,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_subjectFolderId_folders_id_fk" FOREIGN KEY ("subjectFolderId") REFERENCES "public"."folders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "folder_shares" ADD CONSTRAINT "folder_shares_folderId_folders_id_fk" FOREIGN KEY ("folderId") REFERENCES "public"."folders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "folders" ADD CONSTRAINT "folders_contentLocationId_storage_locations_id_fk" FOREIGN KEY ("contentLocationId") REFERENCES "public"."storage_locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "folders" ADD CONSTRAINT "folders_metadataLocationId_storage_locations_id_fk" FOREIGN KEY ("metadataLocationId") REFERENCES "public"."storage_locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "folders" ADD CONSTRAINT "folders_ownerId_users_id_fk" FOREIGN KEY ("ownerId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "log_entries" ADD CONSTRAINT "log_entries_subjectFolderId_folders_id_fk" FOREIGN KEY ("subjectFolderId") REFERENCES "public"."folders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storage_locations" ADD CONSTRAINT "storage_locations_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_triggeringEventId_events_id_fk" FOREIGN KEY ("triggeringEventId") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_subjectFolderId_folders_id_fk" FOREIGN KEY ("subjectFolderId") REFERENCES "public"."folders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "folder_objects_folder_id_media_type_size_bytes_idx" ON "folder_objects" USING btree ("folderId","sizeBytes","mediaType");--> statement-breakpoint
CREATE INDEX "folder_objects_folder_id_media_type_idx" ON "folder_objects" USING btree ("folderId","mediaType");--> statement-breakpoint
CREATE UNIQUE INDEX "folder_objects_folder_id_object_key_unique" ON "folder_objects" USING btree ("folderId","objectKey");--> statement-breakpoint
CREATE INDEX "user_idx" ON "folder_shares" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "folder_user_unique" ON "folder_shares" USING btree ("folderId","userId");