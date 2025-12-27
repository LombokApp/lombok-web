import { describe, expect, it } from 'bun:test'
import { KVService } from 'src/cache/kv.service'

import { OrmService } from './orm.service'

describe('OrmService', () => {
  describe('removeSchemaReferencesFromMigration', () => {
    const mockConfig = {
      dbHost: 'localhost',
      dbPort: 5432,
      dbUser: 'test',
      dbPassword: 'test',
      dbName: 'test',
      logQueries: false,
      disableNoticeLogging: false,
      runMigrations: false,
      createDatabase: false,
    }
    const mockKvService = new KVService()

    it('should remove CREATE SCHEMA statements', () => {
      const ormService = new OrmService(mockConfig, mockKvService)
      const content = `
        CREATE SCHEMA IF NOT EXISTS "public";
        CREATE TABLE users (id SERIAL PRIMARY KEY);
        CREATE SCHEMA test_schema;
      `

      const result = ormService['removeSchemaReferencesFromMigration'](content)

      expect(result).not.toContain('CREATE SCHEMA')
      expect(result).toContain('CREATE TABLE users')
    })

    it('should remove schema prefixes from quoted identifiers', () => {
      const ormService = new OrmService(mockConfig, mockKvService)
      const content = `
        ALTER TABLE "app_agents"."messages" ADD CONSTRAINT "messages_threadId_threads_id_fk" 
        FOREIGN KEY ("threadId") REFERENCES "public"."threads"("id") ON DELETE cascade ON UPDATE no action;
        CREATE VIEW "public"."user_view" AS SELECT * FROM "public"."users";
      `

      const result = ormService['removeSchemaReferencesFromMigration'](content)

      expect(result).toContain('REFERENCES "threads"("id")')
      expect(result).toContain('CREATE VIEW "user_view"')
      expect(result).not.toContain('"public"."threads"')
      expect(result).not.toContain('"public"."user_view"')
    })

    it('should remove schema prefixes from unquoted identifiers', () => {
      const ormService = new OrmService(mockConfig, mockKvService)
      const content = `
        CREATE TABLE public.users (id SERIAL PRIMARY KEY);
        CREATE VIEW public.user_view AS SELECT * FROM public.users;
        ALTER TABLE public.messages ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES public.users(id);
      `

      const result = ormService['removeSchemaReferencesFromMigration'](content)

      expect(result).toContain('CREATE TABLE users')
      expect(result).toContain('CREATE VIEW user_view')
      expect(result).toContain('REFERENCES users(id)')
      expect(result).not.toContain('public.users')
      expect(result).not.toContain('public.user_view')
    })

    it('should handle mixed quoted and unquoted identifiers', () => {
      const ormService = new OrmService(mockConfig, mockKvService)
      const content = `
        CREATE TABLE "public"."users" (id SERIAL PRIMARY KEY);
        CREATE VIEW public.user_view AS SELECT * FROM "public"."users";
        ALTER TABLE public."messages" ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES "public".users(id);
      `

      const result = ormService['removeSchemaReferencesFromMigration'](content)

      expect(result).toContain('CREATE TABLE "users"')
      expect(result).toContain('CREATE VIEW user_view')
      expect(result).toContain('ALTER TABLE "messages"')
      expect(result).toContain('REFERENCES users(id)')
      expect(result).not.toContain('"public".')
      expect(result).not.toContain('public.')
    })

    it('should clean up extra whitespace after removing statements', () => {
      const ormService = new OrmService(mockConfig, mockKvService)
      const content = `
        CREATE SCHEMA test_schema;


        CREATE TABLE users (id SERIAL PRIMARY KEY);


        CREATE SCHEMA another_schema;
      `

      const result = ormService['removeSchemaReferencesFromMigration'](content)

      expect(result).not.toContain('CREATE SCHEMA')
      expect(result).toContain('CREATE TABLE users')
      // Should not have excessive newlines
      expect(result).not.toMatch(/\n\s*\n\s*\n/)
    })

    it('should trim the result', () => {
      const ormService = new OrmService(mockConfig, mockKvService)
      const content = `
        CREATE SCHEMA test_schema;
        CREATE TABLE users (id SERIAL PRIMARY KEY);
      `

      const result = ormService['removeSchemaReferencesFromMigration'](content)

      expect(result).toBe('CREATE TABLE users (id SERIAL PRIMARY KEY);')
      expect(result).not.toMatch(/^\s+/)
      expect(result).not.toMatch(/\s+$/)
    })

    it('should handle empty content', () => {
      const ormService = new OrmService(mockConfig, mockKvService)
      const content = ''

      const result = ormService['removeSchemaReferencesFromMigration'](content)

      expect(result).toBe('')
    })

    it('should handle content with only CREATE SCHEMA statements', () => {
      const ormService = new OrmService(mockConfig, mockKvService)
      const content = `
        CREATE SCHEMA IF NOT EXISTS "public";
        CREATE SCHEMA test_schema;
      `

      const result = ormService['removeSchemaReferencesFromMigration'](content)

      expect(result).toBe('')
    })

    it('should handle complex migration with multiple schema references', () => {
      const ormService = new OrmService(mockConfig, mockKvService)
      const content = `
        CREATE SCHEMA IF NOT EXISTS "public";
        
        CREATE TABLE "public"."users" (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL
        );
        
        CREATE VIEW "public"."active_users" AS 
        SELECT * FROM "public"."users" WHERE active = true;
        
        ALTER TABLE "public"."messages" 
        ADD CONSTRAINT "messages_user_id_fk" 
        FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");
        
        CREATE INDEX "public"."idx_users_name" ON "public"."users"("name");
      `

      const result = ormService['removeSchemaReferencesFromMigration'](content)

      expect(result).not.toContain('CREATE SCHEMA')
      expect(result).toContain('CREATE TABLE "users"')
      expect(result).toContain('CREATE VIEW "active_users"')
      expect(result).toContain('REFERENCES "users"("id")')
      expect(result).toContain('CREATE INDEX "idx_users_name"')
      expect(result).not.toContain('"public".')
    })

    it('should preserve non-schema related SQL statements', () => {
      const ormService = new OrmService(mockConfig, mockKvService)
      const content = `
        CREATE TABLE users (id SERIAL PRIMARY KEY);
        INSERT INTO users (name) VALUES ('test');
        UPDATE users SET name = 'updated' WHERE id = 1;
        DELETE FROM users WHERE id = 1;
        SELECT * FROM users;
      `

      const result = ormService['removeSchemaReferencesFromMigration'](content)

      expect(result).toContain('CREATE TABLE users')
      expect(result).toContain('INSERT INTO users')
      expect(result).toContain('UPDATE users')
      expect(result).toContain('DELETE FROM users')
      expect(result).toContain('SELECT * FROM users')
    })

    it('should remove SET search_path statements', () => {
      const ormService = new OrmService(mockConfig, mockKvService)
      const content = `
        SET search_path TO public, pg_catalog;
        CREATE TABLE users (id SERIAL PRIMARY KEY);
        SET search_path TO "public";
      `

      const result = ormService['removeSchemaReferencesFromMigration'](content)

      expect(result).not.toContain('SET search_path')
      expect(result).toContain('CREATE TABLE users')
    })

    it('should remove WITH SCHEMA clauses from CREATE EXTENSION statements', () => {
      const ormService = new OrmService(mockConfig, mockKvService)
      const content = `
        CREATE EXTENSION IF NOT EXISTS hstore WITH SCHEMA public;
        CREATE TABLE users (id SERIAL PRIMARY KEY);
        CREATE EXTENSION pg_trgm WITH SCHEMA "public";
      `

      const result = ormService['removeSchemaReferencesFromMigration'](content)

      expect(result).toContain('CREATE EXTENSION IF NOT EXISTS hstore;')
      expect(result).toContain('CREATE EXTENSION pg_trgm;')
      expect(result).not.toContain('WITH SCHEMA')
      expect(result).toContain('CREATE TABLE users')
    })

    it('should remove IN SCHEMA clauses from ALTER DEFAULT PRIVILEGES', () => {
      const ormService = new OrmService(mockConfig, mockKvService)
      const content = `
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO someuser;
        CREATE TABLE users (id SERIAL PRIMARY KEY);
        ALTER DEFAULT PRIVILEGES IN SCHEMA "public" GRANT INSERT ON TABLES TO anotheruser;
      `

      const result = ormService['removeSchemaReferencesFromMigration'](content)

      expect(result).toContain(
        'ALTER DEFAULT PRIVILEGES GRANT SELECT ON TABLES TO someuser;',
      )
      expect(result).toContain(
        'ALTER DEFAULT PRIVILEGES GRANT INSERT ON TABLES TO anotheruser;',
      )
      expect(result).not.toContain('IN SCHEMA')
      expect(result).toContain('CREATE TABLE users')
    })

    it('should handle complex migration with all schema reference types', () => {
      const ormService = new OrmService(mockConfig, mockKvService)
      const content = `
        CREATE SCHEMA IF NOT EXISTS "public";
        SET search_path TO public, pg_catalog;
        
        CREATE TABLE "public"."users" (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL
        );
        
        CREATE VIEW "public"."active_users" AS 
        SELECT * FROM "public"."users" WHERE active = true;
        
        ALTER TABLE "public"."messages" 
        ADD CONSTRAINT "messages_user_id_fk" 
        FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");
        
        CREATE EXTENSION IF NOT EXISTS hstore WITH SCHEMA public;
        
        ALTER DEFAULT PRIVILEGES IN SCHEMA public 
        GRANT SELECT ON TABLES TO readonly_user;
        
        CREATE INDEX "public"."idx_users_name" ON "public"."users"("name");
      `

      const result = ormService['removeSchemaReferencesFromMigration'](content)

      expect(result).not.toContain('CREATE SCHEMA')
      expect(result).not.toContain('SET search_path')
      expect(result).not.toContain('WITH SCHEMA')
      expect(result).not.toContain('IN SCHEMA')
      expect(result).toContain('CREATE TABLE "users"')
      expect(result).toContain('CREATE VIEW "active_users"')
      expect(result).toContain('REFERENCES "users"("id")')
      expect(result).toContain('CREATE EXTENSION IF NOT EXISTS hstore;')
      expect(result).toContain(
        'ALTER DEFAULT PRIVILEGES GRANT SELECT ON TABLES TO readonly_user;',
      )
      expect(result).toContain('CREATE INDEX "idx_users_name"')
      expect(result).not.toContain('"public".')
    })

    it('should handle DROP statements with schema references', () => {
      const ormService = new OrmService(mockConfig, mockKvService)
      const content = `
        DROP TABLE IF EXISTS "public"."old_table";
        DROP VIEW IF EXISTS public.old_view;
        DROP INDEX IF EXISTS "public"."old_index";
        CREATE TABLE users (id SERIAL PRIMARY KEY);
      `

      const result = ormService['removeSchemaReferencesFromMigration'](content)

      expect(result).toContain('DROP TABLE IF EXISTS "old_table";')
      expect(result).toContain('DROP VIEW IF EXISTS old_view;')
      expect(result).toContain('DROP INDEX IF EXISTS "old_index";')
      expect(result).toContain('CREATE TABLE users')
      expect(result).not.toContain('"public".')
    })

    it('should handle GRANT and REVOKE statements with schema references', () => {
      const ormService = new OrmService(mockConfig, mockKvService)
      const content = `
        GRANT SELECT ON "public"."users" TO readonly_user;
        REVOKE ALL ON public.messages FROM some_user;
        GRANT INSERT ON "public"."logs" TO write_user;
        CREATE TABLE users (id SERIAL PRIMARY KEY);
      `

      const result = ormService['removeSchemaReferencesFromMigration'](content)

      expect(result).toContain('GRANT SELECT ON "users" TO readonly_user;')
      expect(result).toContain('REVOKE ALL ON messages FROM some_user;')
      expect(result).toContain('GRANT INSERT ON "logs" TO write_user;')
      expect(result).toContain('CREATE TABLE users')
      expect(result).not.toContain('"public".')
    })

    it('should handle edge cases with system schema references', () => {
      const ormService = new OrmService(mockConfig, mockKvService)
      const content = `
        CREATE TABLE users (id SERIAL PRIMARY KEY);
        -- This should be stripped but pg_catalog functions should still work
        SELECT pg_catalog.now() as current_time;
        -- References to information_schema should be preserved for introspection
        SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
      `

      const result = ormService['removeSchemaReferencesFromMigration'](content)

      expect(result).toContain('CREATE TABLE users')
      expect(result).toContain('SELECT pg_catalog.now()')
      expect(result).toContain(
        'SELECT table_name FROM information_schema.tables',
      )
    })
  })
})
