import pgPkg from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import prismaPkg from '@prisma/client'

const { Pool } = pgPkg
const { PrismaClient } = prismaPkg

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/ifood_clone?schema=public"

const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)

export const prisma = new PrismaClient({ adapter })
