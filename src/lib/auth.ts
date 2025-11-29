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

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        role: { label: 'Role', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password || !credentials?.role) {
          throw new Error('Please provide email, password, and role')
        }

        const role = credentials.role as UserRole

        if (role === 'STUDENT') {
          const student = await prisma.student.findUnique({
            where: { rollNo: credentials.email as string },  // Use rollNo as username
            select: {
              id: true,
              email: true,
              name: true,
              password: true,
              status: true,
            },
          })

          if (!student) {
            throw new Error('No student found with this roll number')
          }

          if (student.status !== 'ACTIVE') {
            throw new Error('Student account is inactive')
          }

          // Password is dateOfBirth in DDMMYYYY format
          if (credentials.password !== student.password) {
            return null
          }

          return {
            id: student.id,
            email: student.email,
            name: student.name,
            role: 'STUDENT' as UserRole,
          }
        } else if (role === 'TEACHER' || role === 'ADMIN') {
          const teacher = await prisma.teacher.findUnique({
            where: { email: credentials.email as string },
            select: {
              id: true,
              email: true,
              name: true,
              password: true,
              isAdmin: true,
              firstLogin: true,
            },
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
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.isAdmin = user.isAdmin
        token.firstLogin = user.firstLogin
      }
      return token
    },
    async session({ session, token }) {
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
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
})

