import NextAuth, { DefaultSession } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from './prisma'

type UserRole = 'ADMIN' | 'TEACHER' | 'STUDENT'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: UserRole
      isAdmin?: boolean
      firstLogin?: boolean
    } & DefaultSession['user']
  }

  interface User {
    id: string
    email: string
    name: string
    role: UserRole
    isAdmin?: boolean
    firstLogin?: boolean
  }
}

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        role: { label: 'Role', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.role) {
          throw new Error('Please provide required credentials')
        }

        const role = credentials.role as UserRole

        if (role === 'STUDENT') {
          const student = await prisma.student.findUnique({
            where: { rollNo: credentials.email as string },  // Use rollNo as username
          })

          if (!student) {
            throw new Error('No student found with this roll number')
          }

          if (student.status !== 'ACTIVE') {
            throw new Error('Student account is inactive')
          }

          // For students, password is the dateOfBirth in DDMMYYYY format (passed in credentials.password)
          // If password is provided, verify it matches
          if (credentials.password && credentials.password !== student.password) {
            return null
          }

          return {
            id: student.id,
            email: student.email,
            name: student.name,
            role: 'STUDENT' as UserRole,
          }
        } else if (role === 'TEACHER' || role === 'ADMIN') {
          if (!credentials.password) {
            throw new Error('Password is required')
          }

          const teacher = await prisma.teacher.findUnique({
            where: { email: credentials.email as string },
          })

          if (!teacher) {
            throw new Error('No teacher found with this email')
          }

          // Check if trying to login as admin
          if (role === 'ADMIN' && !teacher.isAdmin) {
            throw new Error('You do not have admin privileges')
          }

          // Password is email ID (plain text)
          if (credentials.password !== teacher.password) {
            return null
          }

          return {
            id: teacher.id,
            email: teacher.email,
            name: teacher.name,
            role: teacher.isAdmin && role === 'ADMIN' ? 'ADMIN' : 'TEACHER' as UserRole,
            isAdmin: teacher.isAdmin,
            firstLogin: teacher.firstLogin,
          }
        }

        throw new Error('Invalid role')
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: {token: any, user?: any}) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.isAdmin = user.isAdmin
        token.firstLogin = user.firstLogin
      }
      return token
    },
    async session({ session, token }: {session: any, token: any}) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as UserRole
        session.user.isAdmin = token.isAdmin as boolean | undefined
        session.user.firstLogin = token.firstLogin as boolean | undefined
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt' as const,
  },
  secret: process.env.NEXTAUTH_SECRET,
}

export const { handlers, signIn, signOut, auth } = NextAuth(authOptions)
