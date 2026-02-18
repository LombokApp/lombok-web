CREATE TABLE "mcp_folder_settings" (
	"folder_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"can_read" boolean,
	"can_write" boolean,
	"can_delete" boolean,
	"can_move" boolean,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mcp_user_settings" (
	"user_id" uuid NOT NULL,
	"can_read" boolean,
	"can_write" boolean,
	"can_delete" boolean,
	"can_move" boolean,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mcp_folder_settings" ADD CONSTRAINT "mcp_folder_settings_folder_id_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."folders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_folder_settings" ADD CONSTRAINT "mcp_folder_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_user_settings" ADD CONSTRAINT "mcp_user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "mcp_folder_settings_folder_user_unique" ON "mcp_folder_settings" USING btree ("folder_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mcp_user_settings_user_id_unique" ON "mcp_user_settings" USING btree ("user_id");