import { Pool } from 'pg'
export const db = new Pool({ connectionString: process.env.POSTGRES_URL })
