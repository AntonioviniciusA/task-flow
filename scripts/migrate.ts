import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
import { join } from "path";

dotenv.config();

async function migrate() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    console.error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN");
    process.exit(1);
  }

  const client = createClient({ url, authToken });

  console.log("Verificando colunas no banco de dados...");

  try {
    // 1. Adicionar coluna all_day se não existir
    try {
      await client.execute(
        "ALTER TABLE tasks ADD COLUMN all_day INTEGER DEFAULT 0",
      );
      console.log('✓ Coluna "all_day" adicionada à tabela tasks');
    } catch (e: any) {
      if (
        e.message.includes("duplicate column name") ||
        e.message.includes("already exists")
      ) {
        console.log('ℹ Coluna "all_day" já existe');
      } else {
        throw e;
      }
    }

    // 2. Adicionar coluna icon se não existir
    try {
      await client.execute("ALTER TABLE tasks ADD COLUMN icon TEXT");
      console.log('✓ Coluna "icon" adicionada à tabela tasks');
    } catch (e: any) {
      if (
        e.message.includes("duplicate column name") ||
        e.message.includes("already exists")
      ) {
        console.log('ℹ Coluna "icon" já existe');
      } else {
        throw e;
      }
    }

    // 3. Adicionar colunas de horários customizados para Dia Todo
    const allDayColumns = [
      { name: "all_day_time1", type: "TEXT DEFAULT '09:00'" },
      { name: "all_day_time2", type: "TEXT DEFAULT '14:00'" },
      { name: "all_day_time3", type: "TEXT DEFAULT '19:00'" },
    ];

    for (const col of allDayColumns) {
      try {
        await client.execute(
          `ALTER TABLE tasks ADD COLUMN ${col.name} ${col.type}`,
        );
        console.log(`✓ Coluna "${col.name}" adicionada à tabela tasks`);
      } catch (e: any) {
        if (
          e.message.includes("duplicate column name") ||
          e.message.includes("already exists")
        ) {
          console.log(`ℹ Coluna "${col.name}" já existe`);
        } else {
          throw e;
        }
      }
    }

    // 4. Adicionar colunas de configuração de notificação ao usuário
    const userColumns = [
      { name: "persistent_interval", type: "INTEGER DEFAULT 60" },
      { name: "notification_sound", type: "INTEGER DEFAULT 1" },
      { name: "notification_vibration", type: "INTEGER DEFAULT 1" },
      { name: "sound_low", type: "TEXT DEFAULT 'default'" },
      { name: "sound_medium", type: "TEXT DEFAULT 'default'" },
      { name: "sound_high", type: "TEXT DEFAULT 'default'" },
    ];

    for (const col of userColumns) {
      try {
        await client.execute(
          `ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`,
        );
        console.log(`✓ Coluna "${col.name}" adicionada à tabela users`);
      } catch (e: any) {
        if (
          e.message.includes("duplicate column name") ||
          e.message.includes("already exists")
        ) {
          console.log(`ℹ Coluna "${col.name}" já existe`);
        } else {
          throw e;
        }
      }
    }

    // 5. Criar tabela task_shares para compartilhamento
    try {
      await client.execute(`
        CREATE TABLE IF NOT EXISTS task_shares (
          task_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          shared_at TEXT DEFAULT (datetime('now')),
          PRIMARY KEY (task_id, user_id),
          FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      console.log('✓ Tabela "task_shares" criada/verificada');
    } catch (e: any) {
      console.error("Error creating task_shares table:", e);
    }

    // 6. Criar tabela temporary_shares para links que expiram
    try {
      // Forçar recriação para mudar esquema (removendo task_id individual para suportar bulk e adicionando mode)
      await client.execute("DROP TABLE IF EXISTS temporary_shares");
      await client.execute(`
        CREATE TABLE IF NOT EXISTS temporary_shares (
          token TEXT PRIMARY KEY,
          created_by TEXT NOT NULL,
          expires_at TEXT NOT NULL,
          mode TEXT DEFAULT 'sync',
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      console.log('✓ Tabela "temporary_shares" criada/verificada');
    } catch (e: any) {
      console.error("Error creating temporary_shares table:", e);
    }

    // 7. Criar tabela temporary_share_tasks (relação N:N para bulk share)
    try {
      await client.execute(`
        CREATE TABLE IF NOT EXISTS temporary_share_tasks (
          token TEXT NOT NULL,
          task_id TEXT NOT NULL,
          PRIMARY KEY (token, task_id),
          FOREIGN KEY (token) REFERENCES temporary_shares(token) ON DELETE CASCADE,
          FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
        )
      `);
      console.log('✓ Tabela "temporary_share_tasks" criada/verificada');
    } catch (e: any) {
      console.error("Error creating temporary_share_tasks table:", e);
    }

    // 8. Gamificação
    console.log("\nIniciando migração de Gamificação...");
    try {
      await client.execute(
        "ALTER TABLE users ADD COLUMN points INTEGER DEFAULT 0",
      );
      console.log('✓ Coluna "points" adicionada à tabela users');
    } catch (e: any) {
      if (!e.message.includes("duplicate column name")) throw e;
    }

    try {
      await client.execute(
        "ALTER TABLE users ADD COLUMN level INTEGER DEFAULT 1",
      );
      console.log('✓ Coluna "level" adicionada à tabela users');
    } catch (e: any) {
      if (!e.message.includes("duplicate column name")) throw e;
    }

    try {
      await client.execute(`
        CREATE TABLE IF NOT EXISTS friendships (
          user_id1 TEXT NOT NULL,
          user_id2 TEXT NOT NULL,
          status TEXT CHECK(status IN ('pending', 'accepted', 'blocked')) DEFAULT 'pending',
          created_at TEXT DEFAULT (datetime('now')),
          PRIMARY KEY (user_id1, user_id2),
          FOREIGN KEY (user_id1) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id2) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      console.log('✓ Tabela "friendships" criada/verificada');
    } catch (e: any) {
      console.error("Error creating friendships table:", e);
    }

    try {
      await client.execute(`
        CREATE TABLE IF NOT EXISTS points_log (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          task_id TEXT,
          points INTEGER NOT NULL,
          reason TEXT NOT NULL,
          created_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL
        )
      `);
      console.log('✓ Tabela "points_log" criada/verificada');
    } catch (e: any) {
      console.error("Error creating points_log table:", e);
    }

    // 9. Grupos
    console.log("\nIniciando migração de Grupos...");
    try {
      await client.execute(`
        CREATE TABLE IF NOT EXISTS groups (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          password_hash TEXT NOT NULL,
          invite_token TEXT UNIQUE NOT NULL,
          created_by TEXT NOT NULL,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now')),
          FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      console.log('✓ Tabela "groups" criada/verificada');
    } catch (e: any) {
      console.error("Error creating groups table:", e);
    }

    try {
      await client.execute(`
        CREATE TABLE IF NOT EXISTS group_members (
          group_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          role TEXT CHECK(role IN ('admin', 'member')) DEFAULT 'member',
          joined_at TEXT DEFAULT (datetime('now')),
          PRIMARY KEY (group_id, user_id),
          FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      console.log('✓ Tabela "group_members" criada/verificada');
    } catch (e: any) {
      console.error("Error creating group_members table:", e);
    }

    try {
      await client.execute(
        "ALTER TABLE tasks ADD COLUMN group_id TEXT REFERENCES groups(id) ON DELETE CASCADE",
      );
      console.log('✓ Coluna "group_id" adicionada à tabela tasks');
    } catch (e: any) {
      if (!e.message.includes("duplicate column name")) throw e;
    }

    // 10. Rastreamento de conclusão de tarefas de grupo
    console.log("\nIniciando migração de Rastreamento de Tarefas...");
    try {
      await client.execute(
        "ALTER TABLE tasks ADD COLUMN completed_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL",
      );
      console.log('✓ Coluna "completed_by_user_id" adicionada à tabela tasks');
    } catch (e: any) {
      if (!e.message.includes("duplicate column name")) throw e;
    }

    // 11. Colunas extras de privacidade e amizade
    console.log("\nIniciando migração de Privacidade e Amizade...");
    try {
      await client.execute(
        "ALTER TABLE users ADD COLUMN is_public INTEGER DEFAULT 1",
      );
      console.log('✓ Coluna "is_public" adicionada à tabela users');
    } catch (e: any) {
      if (!e.message.includes("duplicate column name")) throw e;
    }

    try {
      await client.execute(
        "ALTER TABLE friendships ADD COLUMN blocked_by TEXT REFERENCES users(id) ON DELETE SET NULL",
      );
      console.log('✓ Coluna "blocked_by" adicionada à tabela friendships');
    } catch (e: any) {
      if (!e.message.includes("duplicate column name")) throw e;
    }

    console.log("\n✅ Migrações concluídas com sucesso!");
  } catch (error) {
    console.error("Erro durante a migração:", error);
  } finally {
    client.close();
  }
}

migrate();
