DO $$ BEGIN
 CREATE TYPE "public"."providerType" AS ENUM('SERVER', 'USER');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "app_log_entries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"appId" uuid NOT NULL,
	"message" text NOT NULL,
	"data" jsonb,
	"level" text DEFAULT 'info' NOT NULL,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "session" (
	"id" uuid PRIMARY KEY NOT NULL,
	"hash" text NOT NULL,
	"userId" uuid NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "event_receipts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"appIdentifier" text NOT NULL,
	"eventId" uuid NOT NULL,
	"eventKey" text NOT NULL,
	"handlerId" text,
	"startedAt" timestamp,
	"completedAt" timestamp,
	"errorAt" timestamp,
	"error" text,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"eventKey" text NOT NULL,
	"data" jsonb NOT NULL,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "folder_objects" (
	"id" uuid PRIMARY KEY NOT NULL,
	"objectKey" text NOT NULL,
	"eTag" text NOT NULL,
	"sizeBytes" bigint NOT NULL,
	"lastModified" bigint NOT NULL,
	"hash" text,
	"contentMetadata" jsonb NOT NULL,
	"contentAttributes" jsonb NOT NULL,
	"folderId" uuid NOT NULL,
	"mimeType" text NOT NULL,
	"mediaType" text NOT NULL,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "folders" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"contentLocationId" uuid NOT NULL,
	"metadataLocationId" uuid NOT NULL,
	"ownerId" uuid NOT NULL,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "locations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"providerType" "providerType" NOT NULL,
	"name" text NOT NULL,
	"endpoint" text NOT NULL,
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
CREATE TABLE IF NOT EXISTS "server_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb,
	"createdAt" timestamp NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
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
DO $$ BEGIN
 ALTER TABLE "event_receipts" ADD CONSTRAINT "event_receipts_eventId_events_id_fk" FOREIGN KEY ("eventId") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "folders" ADD CONSTRAINT "folders_contentLocationId_locations_id_fk" FOREIGN KEY ("contentLocationId") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "folders" ADD CONSTRAINT "folders_metadataLocationId_locations_id_fk" FOREIGN KEY ("metadataLocationId") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "folders" ADD CONSTRAINT "folders_ownerId_users_id_fk" FOREIGN KEY ("ownerId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "locations" ADD CONSTRAINT "locations_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
