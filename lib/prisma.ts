import { prisma } from '@/lib/db'

export function getPrisma() {
  return prisma
}

export default getPrisma