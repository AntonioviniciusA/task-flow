import { createClient } from '@libsql/client'
import { readFileSync } from 'fs'
import { join } from 'path'

async function initDatabase() {
  const url = process.env.TURSO_DATABASE_URL
  const authToken = process.env.TURSO_AUTH_TOKEN

  if (!url || !authToken) {
    console.error('Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN environment variables')
    process.exit(1)
  }

  const client = createClient({ url, authToken })

  console.log('Connecting to TursoSQL database...')

  try {
    // Read and execute SQL file
    const sqlPath = join(process.cwd(), 'scripts', '001-create-tables.sql')
    const sql = readFileSync(sqlPath, 'utf-8')
    
    // Split by semicolons but handle edge cases
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    console.log(`Executing ${statements.length} SQL statements...`)

    for (const statement of statements) {
      try {
        await client.execute(statement)
        console.log(`  ✓ ${statement.substring(0, 50)}...`)
      } catch (error) {
        // Ignore "already exists" errors
        if (error instanceof Error && error.message.includes('already exists')) {
          console.log(`  - Skipped (already exists): ${statement.substring(0, 50)}...`)
        } else {
          throw error
        }
      }
    }

    console.log('\n✓ Database initialized successfully!')
  } catch (error) {
    console.error('Failed to initialize database:', error)
    process.exit(1)
  } finally {
    client.close()
  }
}

initDatabase()
