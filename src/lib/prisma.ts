import { PrismaClient } from '@prisma/client'

/**
 * PrismaClient Singleton Pattern
 * 
 * In development, Next.js hot-reloading can cause multiple instances of PrismaClient 
 * to be created, leading to MongoDB connection limit exhaustion.
 * 
 * This singleton pattern ensures only one instance is created and reused.
 * On Netlify/Serverless, this helps manage connection limits during cold starts.
 */

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    // MongoDB specific connection tuning can be added here if needed
  })
}

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

export const prisma = globalThis.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma

export default prisma
