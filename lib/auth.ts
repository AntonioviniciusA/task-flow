import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { compare, hash } from 'bcryptjs'
import { nanoid } from 'nanoid'
import { db } from './db'
import type { User } from './types'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const email = credentials.email as string
        const password = credentials.password as string

        try {
          const result = await db.execute({
            sql: 'SELECT * FROM users WHERE email = ?',
            args: [email],
          })

          if (result.rows.length === 0) {
            return null
          }

          const user = result.rows[0] as unknown as User

          const isValidPassword = await compare(password, user.password_hash || '')

          if (!isValidPassword) {
            return null
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
          }
        } catch (error) {
          console.error('Auth error:', error)
          return null
        }
      },
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
      }
      return session
    },
  },
  session: {
    strategy: 'jwt',
  },
})

// Helper function to hash passwords
export async function hashPassword(password: string): Promise<string> {
  return hash(password, 12)
}

// Helper function to create a new user
export async function createUser(
  email: string,
  password: string,
  name: string
): Promise<User | null> {
  try {
    const existingUser = await db.execute({
      sql: 'SELECT id FROM users WHERE email = ?',
      args: [email],
    })

    if (existingUser.rows.length > 0) {
      return null
    }

    const id = nanoid()
    const passwordHash = await hashPassword(password)
    const now = new Date().toISOString()

    await db.execute({
      sql: `INSERT INTO users (id, email, name, password_hash, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [id, email, name, passwordHash, now, now],
    })

    return {
      id,
      email,
      name,
      created_at: now,
      updated_at: now,
    }
  } catch (error) {
    console.error('Error creating user:', error)
    return null
  }
}

// Helper to get current user from session
export async function getCurrentUser(): Promise<User | null> {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return null
    }

    const result = await db.execute({
      sql: 'SELECT id, email, name, created_at, updated_at FROM users WHERE id = ?',
      args: [session.user.id],
    })

    if (result.rows.length === 0) {
      return null
    }

    return result.rows[0] as unknown as User
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

// Type augmentation for NextAuth
declare module 'next-auth' {
  interface User {
    id: string
    email: string
    name: string
  }
  
  interface Session {
    user: User
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
  }
}
