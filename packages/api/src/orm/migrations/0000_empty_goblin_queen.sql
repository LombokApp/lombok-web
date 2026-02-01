CREATE TABLE "app_folder_settings" (
	"folder_id" uuid NOT NULL,
	"app_identifier" text NOT NULL,
	"enabled" boolean,
	"permissions" jsonb,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_user_settings" (
	"user_id" uuid NOT NULL,
	"app_identifier" text NOT NULL,
	"enabled" boolean,
	"folder_scope_enabled_default" boolean,
	"folder_scope_permissions_default" jsonb,
	"permissions" jsonb,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "apps" (
	"identifier" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"label" text NOT NULL,
	"public_key" text NOT NULL,
	"requires_storage" boolean NOT NULL,
	"subscribed_core_events" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"implemented_tasks" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"content_hash" text NOT NULL,
	"config" jsonb NOT NULL,
	"user_scope_enabled_default" boolean NOT NULL,
	"folder_scope_enabled_default" boolean NOT NULL,
	"permissions" jsonb DEFAULT '{"core":[],"user":[],"folder":[]}'::jsonb NOT NULL,
	"runtime_workers" jsonb NOT NULL,
	"ui" jsonb NOT NULL,
	"database" boolean DEFAULT false NOT NULL,
	"manifest" jsonb NOT NULL,
	"container_profiles" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" uuid PRIMARY KEY NOT NULL,
	"hash" text NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"type_details" jsonb,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_identities" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"provider_user_id" text NOT NULL,
	"provider_email" text,
	"provider_name" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "unique_provider_user" UNIQUE("provider","provider_user_id"),
	CONSTRAINT "unique_user_provider" UNIQUE("user_id","provider")
);
--> statement-breakpoint
CREATE TABLE "comment_mentions" (
	"comment_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "comment_mentions_comment_id_user_id_pk" PRIMARY KEY("comment_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "comment_reactions" (
	"comment_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"emoji" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "comment_reactions_comment_id_user_id_emoji_pk" PRIMARY KEY("comment_id","user_id","emoji")
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"folder_id" uuid NOT NULL,
	"folder_object_id" uuid NOT NULL,
	"root_id" uuid,
	"quote_id" uuid,
	"author_id" uuid NOT NULL,
	"content" text NOT NULL,
	"anchor" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "content_not_empty" CHECK (length(content) > 0),
	CONSTRAINT "anchor_only_on_root" CHECK (
      (root_id IS NOT NULL AND anchor IS NULL) OR
      root_id IS NULL
    ),
	CONSTRAINT "no_self_quote" CHECK (quote_id != id)
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"event_identifier" text NOT NULL,
	"emitter_identifier" text NOT NULL,
	"target_user_id" uuid,
	"actor_user_id" uuid,
	"target_location_folder_id" uuid,
	"target_location_object_key" text,
	"data" jsonb,
	"aggregation_key" text,
	"aggregation_handled_at" timestamp,
	"created_at" timestamp NOT NULL,
	CONSTRAINT "anchor_only_on_root" CHECK (
      (target_user_id IS NOT NULL AND target_location_folder_id IS NULL AND target_location_object_key IS NULL) OR
      (target_user_id IS NULL AND target_location_folder_id IS NULL AND target_location_object_key IS NULL) OR
      (target_user_id IS NULL AND target_location_folder_id IS NOT NULL AND target_location_object_key IS NOT NULL) OR
      (target_user_id IS NULL AND target_location_folder_id IS NOT NULL AND target_location_object_key IS NULL)
    )
);
--> statement-breakpoint
CREATE TABLE "folder_objects" (
	"id" uuid PRIMARY KEY NOT NULL,
	"object_key" text NOT NULL,
	"filename" text NOT NULL,
	"e_tag" text NOT NULL,
	"size_bytes" bigint NOT NULL,
	"last_modified" bigint NOT NULL,
	"hash" text,
	"content_metadata" jsonb NOT NULL,
	"folder_id" uuid NOT NULL,
	"mime_type" text NOT NULL,
	"media_type" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "folder_shares" (
	"folder_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"permissions" text[] NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "folders" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"content_location_id" uuid NOT NULL,
	"metadata_location_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"access_error" jsonb,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "log_entries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"message" text NOT NULL,
	"emitter_identifier" text NOT NULL,
	"target_location_folder_id" uuid,
	"target_location_object_key" text,
	"level" text NOT NULL,
	"data" jsonb,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notification_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"read_at" timestamp,
	"email_status" text,
	"email_sent_at" timestamp,
	"email_failed_at" timestamp,
	"email_error" jsonb,
	"mobile_status" text,
	"mobile_sent_at" timestamp,
	"mobile_failed_at" timestamp,
	"mobile_error" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_settings" (
	"user_id" uuid NOT NULL,
	"event_identifier" text NOT NULL,
	"emitter_identifier" text NOT NULL,
	"channel" text NOT NULL,
	"enabled" boolean NOT NULL,
	"folder_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_identifier" text NOT NULL,
	"emitter_identifier" text NOT NULL,
	"aggregation_key" text NOT NULL,
	"target_location_folder_id" uuid,
	"target_location_object_key" text,
	"target_user_id" uuid,
	"event_ids" uuid[] NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"image" text,
	"path" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "server_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "storage_locations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"access_key_hash_id" text NOT NULL,
	"provider_type" text NOT NULL,
	"label" text NOT NULL,
	"endpoint" text NOT NULL,
	"endpoint_domain" text NOT NULL,
	"region" text NOT NULL,
	"access_key_id" text NOT NULL,
	"secret_access_key" text NOT NULL,
	"bucket" text NOT NULL,
	"prefix" text NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_identifier" text NOT NULL,
	"task_identifier" text NOT NULL,
	"task_description" text NOT NULL,
	"data" jsonb NOT NULL,
	"invocation" jsonb NOT NULL,
	"idempotency_key" text NOT NULL,
	"target_user_id" uuid,
	"target_location_folder_id" uuid,
	"target_location_object_key" text,
	"started_at" timestamp,
	"completed_at" timestamp,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"failure_count" integer DEFAULT 0 NOT NULL,
	"dont_start_before" timestamp,
	"system_log" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"task_log" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"storage_access_policy" jsonb,
	"success" boolean,
	"user_visible" boolean DEFAULT true,
	"error" jsonb,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"latest_heartbeat_at" timestamp,
	"handler_type" text NOT NULL,
	"handler_identifier" text,
	CONSTRAINT "tasks_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"name" text,
	"username" text NOT NULL,
	"email" text,
	"email_verified" boolean DEFAULT false NOT NULL,
	"email_verification_key" text,
	"permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"password_hash" text,
	"password_salt" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app_folder_settings" ADD CONSTRAINT "app_folder_settings_folder_id_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."folders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_folder_settings" ADD CONSTRAINT "app_folder_settings_app_identifier_apps_identifier_fk" FOREIGN KEY ("app_identifier") REFERENCES "public"."apps"("identifier") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_user_settings" ADD CONSTRAINT "app_user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_user_settings" ADD CONSTRAINT "app_user_settings_app_identifier_apps_identifier_fk" FOREIGN KEY ("app_identifier") REFERENCES "public"."apps"("identifier") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_identities" ADD CONSTRAINT "user_identities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_mentions" ADD CONSTRAINT "comment_mentions_comment_id_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_mentions" ADD CONSTRAINT "comment_mentions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_reactions" ADD CONSTRAINT "comment_reactions_comment_id_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_reactions" ADD CONSTRAINT "comment_reactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_folder_id_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."folders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_folder_object_id_folder_objects_id_fk" FOREIGN KEY ("folder_object_id") REFERENCES "public"."folder_objects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_root_id_comments_id_fk" FOREIGN KEY ("root_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_quote_id_comments_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."comments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "folder_objects" ADD CONSTRAINT "folder_objects_folder_id_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."folders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "folder_shares" ADD CONSTRAINT "folder_shares_folder_id_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."folders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "folder_shares" ADD CONSTRAINT "folder_shares_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "folders" ADD CONSTRAINT "folders_content_location_id_storage_locations_id_fk" FOREIGN KEY ("content_location_id") REFERENCES "public"."storage_locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "folders" ADD CONSTRAINT "folders_metadata_location_id_storage_locations_id_fk" FOREIGN KEY ("metadata_location_id") REFERENCES "public"."storage_locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "folders" ADD CONSTRAINT "folders_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_notification_id_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_settings" ADD CONSTRAINT "notification_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_settings" ADD CONSTRAINT "notification_settings_folder_id_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."folders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_target_location_folder_id_folders_id_fk" FOREIGN KEY ("target_location_folder_id") REFERENCES "public"."folders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "storage_locations" ADD CONSTRAINT "storage_locations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "app_folder_settings_folder_id_idx" ON "app_folder_settings" USING btree ("folder_id");--> statement-breakpoint
CREATE UNIQUE INDEX "app_folder_settings_folder_app_unique" ON "app_folder_settings" USING btree ("folder_id","app_identifier");--> statement-breakpoint
CREATE INDEX "app_user_settings_user_id_idx" ON "app_user_settings" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "app_user_settings_user_app_unique" ON "app_user_settings" USING btree ("user_id","app_identifier");--> statement-breakpoint
CREATE UNIQUE INDEX "apps_slug_unique" ON "apps" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "apps_enabled_idx" ON "apps" USING btree ("enabled");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_expires_at_idx" ON "session" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_mentions_user_lookup" ON "comment_mentions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_reactions_comment_lookup" ON "comment_reactions" USING btree ("comment_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_comments_folder_object_roots" ON "comments" USING btree ("folder_object_id","created_at") WHERE root_id IS NULL AND deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_comments_thread_flat" ON "comments" USING btree ("root_id","created_at") WHERE root_id IS NOT NULL AND deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_comments_tombstone_lookup" ON "comments" USING btree ("id","deleted_at","author_id");--> statement-breakpoint
CREATE INDEX "idx_comments_folder_id" ON "comments" USING btree ("folder_id","created_at");--> statement-breakpoint
CREATE INDEX "events_target_location_folder_id_idx" ON "events" USING btree ("target_location_folder_id");--> statement-breakpoint
CREATE INDEX "events_actor_user_id_idx" ON "events" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "events_target_user_id_idx" ON "events" USING btree ("target_location_folder_id");--> statement-breakpoint
CREATE INDEX "events_created_at_idx" ON "events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "events_emitter_identifier_idx" ON "events" USING btree ("emitter_identifier");--> statement-breakpoint
CREATE INDEX "events_folder_created_at_idx" ON "events" USING btree ("target_location_folder_id","created_at");--> statement-breakpoint
CREATE INDEX "events_target_object_key_idx" ON "events" USING btree ("target_location_object_key");--> statement-breakpoint
CREATE INDEX "events_aggregation_key_idx" ON "events" USING btree ("aggregation_key");--> statement-breakpoint
CREATE INDEX "events_aggregation_handled_at_idx" ON "events" USING btree ("aggregation_handled_at");--> statement-breakpoint
CREATE INDEX "folder_objects_folder_id_media_type_size_bytes_idx" ON "folder_objects" USING btree ("folder_id","size_bytes","media_type");--> statement-breakpoint
CREATE INDEX "folder_objects_folder_id_media_type_idx" ON "folder_objects" USING btree ("folder_id","media_type");--> statement-breakpoint
CREATE UNIQUE INDEX "folder_objects_folder_id_object_key_unique" ON "folder_objects" USING btree ("folder_id","object_key");--> statement-breakpoint
CREATE INDEX "folder_shares_user_id_idx" ON "folder_shares" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "folder_shares_folder_user_unique" ON "folder_shares" USING btree ("folder_id","user_id");--> statement-breakpoint
CREATE INDEX "folders_owner_id_idx" ON "folders" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "folders_content_location_id_idx" ON "folders" USING btree ("content_location_id");--> statement-breakpoint
CREATE INDEX "folders_metadata_location_id_idx" ON "folders" USING btree ("metadata_location_id");--> statement-breakpoint
CREATE INDEX "log_entries_target_location_folder_id_idx" ON "log_entries" USING btree ("target_location_folder_id");--> statement-breakpoint
CREATE INDEX "log_entries_created_at_idx" ON "log_entries" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "log_entries_emitter_identifier_idx" ON "log_entries" USING btree ("emitter_identifier");--> statement-breakpoint
CREATE INDEX "log_entries_folder_created_at_idx" ON "log_entries" USING btree ("target_location_folder_id","created_at");--> statement-breakpoint
CREATE INDEX "log_entries_level_idx" ON "log_entries" USING btree ("level");--> statement-breakpoint
CREATE INDEX "log_entries_target_object_key_idx" ON "log_entries" USING btree ("target_location_object_key");--> statement-breakpoint
CREATE INDEX "notification_deliveries_notification_id_idx" ON "notification_deliveries" USING btree ("notification_id");--> statement-breakpoint
CREATE INDEX "notification_deliveries_user_id_idx" ON "notification_deliveries" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_deliveries_notification_user_unique" ON "notification_deliveries" USING btree ("notification_id","user_id");--> statement-breakpoint
CREATE INDEX "notification_settings_user_id_emitter_identifier_idx" ON "notification_settings" USING btree ("user_id","emitter_identifier","event_identifier");--> statement-breakpoint
CREATE INDEX "notification_settings_emitter_identifier_idx" ON "notification_settings" USING btree ("emitter_identifier");--> statement-breakpoint
CREATE INDEX "notification_settings_folder_id_idx" ON "notification_settings" USING btree ("folder_id");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_settings_user_emitter_identifier_channel_unique" ON "notification_settings" USING btree ("user_id","emitter_identifier","event_identifier","channel");--> statement-breakpoint
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications" USING btree ("target_user_id","created_at");--> statement-breakpoint
CREATE INDEX "notifications_aggregation_key_idx" ON "notifications" USING btree ("aggregation_key");--> statement-breakpoint
CREATE INDEX "notifications_target_location_folder_id_idx" ON "notifications" USING btree ("target_location_folder_id");--> statement-breakpoint
CREATE INDEX "notifications_emitter_identifier_idx" ON "notifications" USING btree ("emitter_identifier");--> statement-breakpoint
CREATE INDEX "storage_locations_user_id_idx" ON "storage_locations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "storage_locations_access_key_hash_id_idx" ON "storage_locations" USING btree ("access_key_hash_id");--> statement-breakpoint
CREATE INDEX "storage_locations_provider_type_idx" ON "storage_locations" USING btree ("provider_type");--> statement-breakpoint
CREATE INDEX "storage_locations_access_key_user_provider_idx" ON "storage_locations" USING btree ("access_key_hash_id","user_id","provider_type");--> statement-breakpoint
CREATE INDEX "tasks_trigger_kind_idx" ON "tasks" USING btree (("invocation" ->> 'kind'));--> statement-breakpoint
CREATE INDEX "tasks_idempotency_key_idx" ON "tasks" USING btree ("owner_identifier","task_identifier","idempotency_key");--> statement-breakpoint
CREATE INDEX "tasks_target_location_folder_id_idx" ON "tasks" USING btree ("target_location_folder_id");--> statement-breakpoint
CREATE INDEX "tasks_target_location_folder_id_object_key_idx" ON "tasks" USING btree ("target_location_folder_id","target_location_object_key");--> statement-breakpoint
CREATE INDEX "tasks_pending_core_idx" ON "tasks" USING btree ("owner_identifier","started_at") WHERE "tasks"."started_at" IS NULL;--> statement-breakpoint
CREATE INDEX "tasks_created_at_idx" ON "tasks" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "tasks_completed_at_success_idx" ON "tasks" USING btree ("completed_at","success");--> statement-breakpoint
CREATE INDEX "tasks_target_user_id_idx" ON "tasks" USING btree ("target_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_username_unique_lower" ON "users" USING btree (lower("username"));--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");