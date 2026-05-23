import { prisma } from '@/src/lib/db'

export function getPrisma() {
  return prisma
}

export default getPrisma