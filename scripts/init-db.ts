import { createClient } from '@libsql/client'
import { readFileSync } from 'fs'
import { join } from 'path'

async function initDatabase() {
  const url = process.env.TURSO_DATABASE_URL
  const authToken = process.env.TURSO_AUTH_TOKEN

  if (!url || !authToken) {
    console.error('Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN')
    process.exit(1)
  }

  const client = createClient({ url, authToken })

  console.log('Connecting to database...')

  try {
    const sqlPath = join(process.cwd(), 'scripts', '001-create-tables.sql')
    const sql = readFileSync(sqlPath, 'utf-8')

    const cleanSql = sql.replace(/--.*$/gm, '')

    const statements = cleanSql
      .split(';')
      .map(s => s.trim())
      .filter(Boolean)

    console.log(`Executing ${statements.length} SQL statements...`)

    for (const statement of statements) {
      await client.execute(statement)
      console.log(`✓ ${statement.substring(0, 60)}...`)
    }

    console.log('\n✅ Database initialized successfully!')
  } catch (error) {
    console.error('Failed to initialize database:', error)
  } finally {
    client.close()
  }
}

initDatabase()