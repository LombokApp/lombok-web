import { Migration } from '@mikro-orm/migrations'

export class Migration20231006162207 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE
        "user" DROP CONSTRAINT IF EXISTS "user_role_check";
    `)

    this.addSql(`
      ALTER TABLE
        "user"
      ADD
        COLUMN "name" TEXT NULL,
      ADD
        COLUMN "permissions" jsonb NOT NULL;
    `)
    this.addSql(`
      ALTER TABLE
        "user"
      ALTER COLUMN
        "role" TYPE TEXT USING ("role" :: TEXT);
    `)
    this.addSql(`
      ALTER TABLE
        "user"
      ADD
        CONSTRAINT "user_role_check" CHECK ("role" IN ('ANONYMOUS', 'USER', 'ADMIN', 'SERVICE'));
    `)
    this.addSql(`
      ALTER TABLE
        "user"
      ALTER COLUMN
        "role"
      SET
        DEFAULT 'USER';
    `)

    this.addSql(`
      ALTER TABLE
        "session"
      ALTER COLUMN
        "scopes" TYPE TEXT[] USING ("scopes" :: TEXT[]);
    `)

    this.addSql(`
      ALTER TABLE
        "email_authentication_key"
      ALTER COLUMN
        "scopes" TYPE TEXT[] USING ("scopes" :: TEXT[]);
    `)

    this.addSql(`
      ALTER TABLE
        "api_key"
      ALTER COLUMN
        "scopes" TYPE TEXT[] USING ("scopes" :: TEXT[]);
    `)
  }

  async down(): Promise<void> {
    this.addSql(`
      ALTER TABLE
        "user" DROP CONSTRAINT IF EXISTS "user_role_check";
    `)

    this.addSql(`
      ALTER TABLE
        "api_key"
      ALTER COLUMN
        "scopes" TYPE TEXT[] USING ("scopes" :: TEXT[]);
    `)

    this.addSql(`
      ALTER TABLE
        "email_authentication_key"
      ALTER COLUMN
        "scopes" TYPE TEXT[] USING ("scopes" :: TEXT[]);
    `)

    this.addSql(`
      ALTER TABLE
        "session"
      ALTER COLUMN
        "scopes" TYPE TEXT[] USING ("scopes" :: TEXT[]);
    `)

    this.addSql(`
      ALTER TABLE
        "user"
      ALTER COLUMN
        "role" TYPE TEXT USING ("role" :: TEXT);
    `)
    this.addSql(`
      ALTER TABLE
        "user"
      ADD
        CONSTRAINT "user_role_check" CHECK (
          "role" IN ('ANONYMOUS', 'AUTHENTICATED', 'ADMIN', 'SERVICE')
        );
    `)
    this.addSql(`
      ALTER TABLE
        "user"
      ALTER COLUMN
        "role"
      SET
        DEFAULT 'AUTHENTICATED';
    `)
    this.addSql(`
      ALTER TABLE
        "user" DROP COLUMN "name";
    `)
    this.addSql(`
      ALTER TABLE
        "user" DROP COLUMN "permissions";
    `)
  }
}
