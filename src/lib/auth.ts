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

        // Check if it's a student login (regNo format)
        console.log('Login attempt:', credentials.email, 'Role:', role);

        const student = await prisma.student.findUnique({
          where: { regNo: credentials.email as string }, // Using email field but checking regNo
        })

        if (student) {
          console.log('Student found:', student.regNo, 'Password in DB:', student.password, 'Input password:', credentials.password);
          
          // For students, use password field if exists, otherwise fall back to regNo
          const studentPassword = student.password || student.regNo
          
          console.log('Expected password:', studentPassword, 'Match:', credentials.password === studentPassword);
          
          if (credentials.password === studentPassword) {
            return {
              id: student.id,
              name: student.name,
              email: student.regNo, // Use regNo as email for session
              role: 'STUDENT',
            }
          }
          console.log('Password mismatch!');
          return null
        }

        console.log('Student not found, checking teacher');

        // Check for regular user (teacher/admin)
        const user = await prisma.teacher.findUnique({
          where: { email: credentials.email as string },
        })

        if (!user) {
          console.log('Teacher not found');
          return null
        }

        const isValid = credentials.password === user.password

        if (!isValid) {
          console.log('Teacher password invalid');
          return null
        }

        // Use the role from credentials instead of determining from isAdmin flag
        // This allows teachers to login as TEACHER even if they have admin privileges
        const userRole = credentials.role as UserRole
        
        // However, only allow ADMIN login if user actually has admin privileges
        if (userRole === 'ADMIN' && !user.isAdmin) {
          console.log('User does not have admin privileges');
          return null
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: userRole,
          isAdmin: user.isAdmin,
        }
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
      if (session?.user) {
        session.user.id = (token.id as string) || ''
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
  trustHost: true,
}

export const { handlers, signIn, signOut, auth } = NextAuth(authOptions)
