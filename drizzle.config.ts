import { defineConfig } from 'drizzle-kit';
import 'dotenv/config';

export default defineConfig({
  schema: './db/schema.ts',
  out: './drizzle',
  dialect: 'mysql',
  dbCredentials: {
    url: process.env.DATABASE_TYPE + '://' +
         process.env.DATABASE_USER + ':' +
         process.env.DATABASE_PASSWORD + '@' +
         process.env.DATABASE_HOST + ':' +
         process.env.DATABASE_PORT + '/' +
         process.env.DATABASE_NAME,
  },
});
