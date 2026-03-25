import pgPkg from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import prismaPkg from '@prisma/client'

const { Pool } = pgPkg
const { PrismaClient } = prismaPkg

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@db_postgres:5432/db_postgres?schema=public"

const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)

export const prisma = new PrismaClient({ adapter })
