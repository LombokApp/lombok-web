import { Migration } from '@mikro-orm/migrations'

export class Migration20231001143954 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE
        "user" DROP COLUMN "status";
    `)
    this.addSql(`
      ALTER TABLE
        "user"
      ADD
        CONSTRAINT "user_email_unique" UNIQUE ("email");
    `)
  }

  async down(): Promise<void> {
    this.addSql(`
      ALTER TABLE
        "user"
      ADD
        COLUMN "status" TEXT CHECK ("status" IN ('PENDING', 'ACTIVE')) NOT NULL DEFAULT 'PENDING';
    `)
    this.addSql(`
      ALTER TABLE
        "user" DROP CONSTRAINT "user_email_unique";
    `)
  }
}
