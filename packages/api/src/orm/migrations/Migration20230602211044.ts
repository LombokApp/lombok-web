import { Migration } from '@mikro-orm/migrations'

export class Migration20230602211044 extends Migration {
  async up(): Promise<void> {
    this.addSql(`CREATE EXTENSION IF NOT EXISTS citext;`)
    this.addSql(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`)

    this.addSql(`
      CREATE TABLE "app_config" (
        "key" citext NOT NULL,
        "created_at" timestamptz(0) NOT NULL,
        "updated_at" timestamptz(0) NOT NULL,
        "value" jsonb NOT NULL,
        CONSTRAINT "app_config_pkey" PRIMARY KEY ("key")
      );
    `)

    this.addSql(`
      CREATE TABLE "user" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" timestamptz(0) NOT NULL,
        "updated_at" timestamptz(0) NOT NULL,
        "role" TEXT CHECK ("role" IN ('ANONYMOUS', 'AUTHENTICATED', 'ADMIN')) NOT NULL DEFAULT 'AUTHENTICATED',
        "status" TEXT CHECK ("status" IN ('PENDING', 'ACTIVE')) NOT NULL DEFAULT 'PENDING',
        "username" TEXT NOT NULL,
        "email" citext NULL,
        CONSTRAINT "user_pkey" PRIMARY KEY ("id")
      );
    `)
    this.addSql(`
      ALTER TABLE
        "user"
      ADD
        CONSTRAINT "user_username_unique" UNIQUE ("username");
    `)

    this.addSql(`
      CREATE TABLE "session" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" timestamptz(0) NOT NULL,
        "updated_at" timestamptz(0) NOT NULL,
        "deleted_at" timestamptz(0) NULL,
        "scopes" TEXT[] NOT NULL,
        "user_id" uuid NULL,
        "hash" VARCHAR(255) NOT NULL,
        "expires_at" timestamptz(0) NOT NULL,
        CONSTRAINT "session_pkey" PRIMARY KEY ("id")
      );
    `)
    this.addSql(`CREATE INDEX "session_scopes_index" ON "session" ("scopes");`)

    this.addSql(`
      CREATE TABLE "s3_connection" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" timestamptz(0) NOT NULL,
        "updated_at" timestamptz(0) NOT NULL,
        "name" VARCHAR(255) NOT NULL,
        "endpoint" VARCHAR(255) NOT NULL,
        "region" VARCHAR(255) NULL,
        "access_key_id" VARCHAR(255) NOT NULL,
        "secret_access_key" VARCHAR(255) NOT NULL,
        "owner_id" uuid NULL,
        CONSTRAINT "s3_connection_pkey" PRIMARY KEY ("id")
      );
    `)

    this.addSql(`
      CREATE TABLE "folder" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" timestamptz(0) NOT NULL,
        "updated_at" timestamptz(0) NOT NULL,
        "name" VARCHAR(255) NOT NULL,
        "endpoint" VARCHAR(255) NOT NULL,
        "bucket" VARCHAR(255) NOT NULL,
        "prefix" VARCHAR(255) NULL,
        "region" VARCHAR(255) NULL,
        "access_key_id" VARCHAR(255) NOT NULL,
        "secret_access_key" VARCHAR(255) NOT NULL,
        "owner_id" uuid NULL,
        CONSTRAINT "folder_pkey" PRIMARY KEY ("id")
      );
    `)

    this.addSql(`
      CREATE TABLE "object_tag" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" timestamptz(0) NOT NULL,
        "updated_at" timestamptz(0) NOT NULL,
        "name" TEXT NOT NULL,
        "folder_id" uuid NOT NULL,
        CONSTRAINT "object_tag_pkey" PRIMARY KEY ("id")
      );
    `)
    this.addSql(`
      ALTER TABLE
        "object_tag"
      ADD
        CONSTRAINT "object_tag_name_folder_id_unique" UNIQUE ("name", "folder_id");
    `)

    this.addSql(`
      CREATE TABLE "folder_share" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" timestamptz(0) NOT NULL,
        "updated_at" timestamptz(0) NOT NULL,
        "user_label" VARCHAR(255) NOT NULL,
        "user_invite_email" VARCHAR(255) NOT NULL,
        "user_id" uuid NULL,
        "folder_id" uuid NOT NULL,
        "share_configuration" jsonb NOT NULL,
        CONSTRAINT "folder_share_pkey" PRIMARY KEY ("id")
      );
    `)
    this.addSql(`
      ALTER TABLE
        "folder_share"
      ADD
        CONSTRAINT "folder_share_user_id_folder_id_unique" UNIQUE ("user_id", "folder_id");
    `)

    this.addSql(`
      CREATE TABLE "folder_object" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" timestamptz(0) NOT NULL,
        "updated_at" timestamptz(0) NOT NULL,
        "object_key" TEXT NOT NULL,
        "e_tag" TEXT NOT NULL,
        "size_bytes" BIGINT NOT NULL,
        "last_modified" BIGINT NOT NULL,
        "content_metadata" jsonb NULL,
        "media_type" TEXT CHECK (
          "media_type" IN ('IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT', 'UNKNOWN')
        ) NOT NULL DEFAULT 'UNKNOWN',
        "folder_id" uuid NOT NULL,
        CONSTRAINT "folder_object_pkey" PRIMARY KEY ("id")
      );
    `)
    this.addSql(`
      ALTER TABLE
        "folder_object"
      ADD
        CONSTRAINT "folder_object_folder_id_object_key_unique" UNIQUE ("folder_id", "object_key");
    `)

    this.addSql(`
      CREATE TABLE "object_tag_relation" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" timestamptz(0) NOT NULL,
        "updated_at" timestamptz(0) NOT NULL,
        "tag_id" uuid NOT NULL,
        "object_id" uuid NOT NULL,
        CONSTRAINT "object_tag_relation_pkey" PRIMARY KEY ("id")
      );
    `)
    this.addSql(`
      ALTER TABLE
        "object_tag_relation"
      ADD
        CONSTRAINT "object_tag_relation_tag_id_object_id_unique" UNIQUE ("tag_id", "object_id");
    `)

    this.addSql(`
      CREATE TABLE "api_key" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" timestamptz(0) NOT NULL,
        "updated_at" timestamptz(0) NOT NULL,
        "deleted_at" timestamptz(0) NULL,
        "scopes" TEXT[] NOT NULL,
        "user_id" uuid NULL,
        "secret" TEXT NOT NULL,
        CONSTRAINT "api_key_pkey" PRIMARY KEY ("id")
      );
    `)
    this.addSql(`CREATE INDEX "api_key_scopes_index" ON "api_key" ("scopes");`)

    this.addSql(`
      CREATE TABLE "access_token" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" timestamptz(0) NOT NULL,
        "updated_at" timestamptz(0) NOT NULL,
        "deleted_at" timestamptz(0) NULL,
        "scopes" TEXT[] NOT NULL,
        "user_id" uuid NULL,
        "hash" VARCHAR(255) NOT NULL,
        CONSTRAINT "access_token_pkey" PRIMARY KEY ("id")
      );
    `)
    this.addSql(
      `CREATE INDEX "access_token_scopes_index" ON "access_token" ("scopes");`,
    )

    this.addSql(`
      ALTER TABLE
        "session"
      ADD
        CONSTRAINT "session_user_id_foreign" FOREIGN KEY ("user_id") REFERENCES "user" ("id") ON
      UPDATE
        CASCADE ON DELETE CASCADE;
    `)

    this.addSql(`
      ALTER TABLE
        "s3_connection"
      ADD
        CONSTRAINT "s3_connection_owner_id_foreign" FOREIGN KEY ("owner_id") REFERENCES "user" ("id") ON
      UPDATE
        CASCADE ON DELETE
      SET
        NULL;
    `)

    this.addSql(`
      ALTER TABLE
        "folder"
      ADD
        CONSTRAINT "folder_owner_id_foreign" FOREIGN KEY ("owner_id") REFERENCES "user" ("id") ON
      UPDATE
        CASCADE ON DELETE
      SET
        NULL;
    `)

    this.addSql(`
      ALTER TABLE
        "object_tag"
      ADD
        CONSTRAINT "object_tag_folder_id_foreign" FOREIGN KEY ("folder_id") REFERENCES "folder" ("id") ON
      UPDATE
        CASCADE ON DELETE CASCADE;
    `)

    this.addSql(`
      ALTER TABLE
        "folder_share"
      ADD
        CONSTRAINT "folder_share_user_id_foreign" FOREIGN KEY ("user_id") REFERENCES "user" ("id") ON
      UPDATE
        CASCADE ON DELETE CASCADE;
    `)
    this.addSql(`
      ALTER TABLE
        "folder_share"
      ADD
        CONSTRAINT "folder_share_folder_id_foreign" FOREIGN KEY ("folder_id") REFERENCES "folder" ("id") ON
      UPDATE
        CASCADE ON DELETE CASCADE;
    `)

    this.addSql(`
      ALTER TABLE
        "folder_object"
      ADD
        CONSTRAINT "folder_object_folder_id_foreign" FOREIGN KEY ("folder_id") REFERENCES "folder" ("id") ON
      UPDATE
        CASCADE ON DELETE CASCADE;
    `)

    this.addSql(`
      ALTER TABLE
        "object_tag_relation"
      ADD
        CONSTRAINT "object_tag_relation_tag_id_foreign" FOREIGN KEY ("tag_id") REFERENCES "object_tag" ("id") ON
      UPDATE
        CASCADE ON DELETE CASCADE;
    `)
    this.addSql(`
      ALTER TABLE
        "object_tag_relation"
      ADD
        CONSTRAINT "object_tag_relation_object_id_foreign" FOREIGN KEY ("object_id") REFERENCES "folder_object" ("id") ON
      UPDATE
        CASCADE ON DELETE CASCADE;
    `)

    this.addSql(`
      ALTER TABLE
        "api_key"
      ADD
        CONSTRAINT "api_key_user_id_foreign" FOREIGN KEY ("user_id") REFERENCES "user" ("id") ON
      UPDATE
        CASCADE ON DELETE CASCADE;
    `)

    this.addSql(`
      ALTER TABLE
        "access_token"
      ADD
        CONSTRAINT "access_token_user_id_foreign" FOREIGN KEY ("user_id") REFERENCES "user" ("id") ON
      UPDATE
        CASCADE ON DELETE CASCADE;
    `)
  }

  async down(): Promise<void> {
    this.addSql(`
      ALTER TABLE
        "session" DROP CONSTRAINT "session_user_id_foreign";
    `)

    this.addSql(`
      ALTER TABLE
        "s3_connection" DROP CONSTRAINT "s3_connection_owner_id_foreign";
    `)

    this.addSql(`
      ALTER TABLE
        "folder" DROP CONSTRAINT "folder_owner_id_foreign";
    `)

    this.addSql(`
      ALTER TABLE
        "folder_share" DROP CONSTRAINT "folder_share_user_id_foreign";
    `)

    this.addSql(`
      ALTER TABLE
        "api_key" DROP CONSTRAINT "api_key_user_id_foreign";
    `)

    this.addSql(`
      ALTER TABLE
        "access_token" DROP CONSTRAINT "access_token_user_id_foreign";
    `)

    this.addSql(`
      ALTER TABLE
        "object_tag" DROP CONSTRAINT "object_tag_folder_id_foreign";
    `)

    this.addSql(`
      ALTER TABLE
        "folder_share" DROP CONSTRAINT "folder_share_folder_id_foreign";
    `)

    this.addSql(`
      ALTER TABLE
        "folder_object" DROP CONSTRAINT "folder_object_folder_id_foreign";
    `)

    this.addSql(`
      ALTER TABLE
        "object_tag_relation" DROP CONSTRAINT "object_tag_relation_tag_id_foreign";
    `)

    this.addSql(`
      ALTER TABLE
        "object_tag_relation" DROP CONSTRAINT "object_tag_relation_object_id_foreign";
    `)

    this.addSql(`DROP TABLE IF EXISTS "app_config" CASCADE;`)

    this.addSql(`DROP TABLE IF EXISTS "user" CASCADE;`)

    this.addSql(`DROP TABLE IF EXISTS "session" CASCADE;`)

    this.addSql(`DROP TABLE IF EXISTS "s3_connection" CASCADE;`)

    this.addSql(`DROP TABLE IF EXISTS "folder" CASCADE;`)

    this.addSql(`DROP TABLE IF EXISTS "object_tag" CASCADE;`)

    this.addSql(`DROP TABLE IF EXISTS "folder_share" CASCADE;`)

    this.addSql(`DROP TABLE IF EXISTS "folder_object" CASCADE;`)

    this.addSql(`DROP TABLE IF EXISTS "object_tag_relation" CASCADE;`)

    this.addSql(`DROP TABLE IF EXISTS "api_key" CASCADE;`)

    this.addSql(`DROP TABLE IF EXISTS "access_token" CASCADE;`)
  }
}
