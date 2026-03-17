import { createClient } from '@libsql/client'
import * as dotenv from 'dotenv'
import { join } from 'path'

dotenv.config()

async function migrate() {
  const url = process.env.TURSO_DATABASE_URL
  const authToken = process.env.TURSO_AUTH_TOKEN

  if (!url || !authToken) {
    console.error('Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN')
    process.exit(1)
  }

  const client = createClient({ url, authToken })

  console.log('Verificando colunas no banco de dados...')

  try {
    // 1. Adicionar coluna all_day se não existir
    try {
      await client.execute("ALTER TABLE tasks ADD COLUMN all_day INTEGER DEFAULT 0")
      console.log('✓ Coluna "all_day" adicionada à tabela tasks')
    } catch (e: any) {
      if (e.message.includes('duplicate column name') || e.message.includes('already exists')) {
        console.log('ℹ Coluna "all_day" já existe')
      } else {
        throw e
      }
    }

    // 2. Adicionar coluna icon se não existir
    try {
      await client.execute("ALTER TABLE tasks ADD COLUMN icon TEXT")
      console.log('✓ Coluna "icon" adicionada à tabela tasks')
    } catch (e: any) {
      if (e.message.includes('duplicate column name') || e.message.includes('already exists')) {
        console.log('ℹ Coluna "icon" já existe')
      } else {
        throw e
      }
    }

    // 3. Adicionar colunas de configuração de notificação ao usuário
    const userColumns = [
      { name: 'persistent_interval', type: 'INTEGER DEFAULT 60' },
      { name: 'notification_sound', type: 'INTEGER DEFAULT 1' },
      { name: 'notification_vibration', type: 'INTEGER DEFAULT 1' }
    ]

    for (const col of userColumns) {
      try {
        await client.execute(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`)
        console.log(`✓ Coluna "${col.name}" adicionada à tabela users`)
      } catch (e: any) {
        if (e.message.includes('duplicate column name') || e.message.includes('already exists')) {
          console.log(`ℹ Coluna "${col.name}" já existe`)
        } else {
          throw e
        }
      }
    }

    console.log('\n✅ Migrações concluídas com sucesso!')
  } catch (error) {
    console.error('Erro durante a migração:', error)
  } finally {
    client.close()
  }
}

migrate()
