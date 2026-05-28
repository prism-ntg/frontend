import mysql from 'mysql2/promise';
import 'dotenv/config';

async function setup() {
  // Koneksi ke server MySQL 
  const connection = await mysql.createConnection({
    host: process.env.DATABASE_HOST,
    port: Number(process.env.DATABASE_PORT) || 3306,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
  });

  const dbName = process.env.DATABASE_NAME || 'prism';
  
  console.log(`🗑️ Menghapus database '${dbName}' jika ada...`);
  await connection.query(`DROP DATABASE IF EXISTS \`${dbName}\`;`);

  console.log(`⏳ Membuat ulang database '${dbName}'...`);
  await connection.query(`CREATE DATABASE \`${dbName}\`;`);
  console.log(`✅ Database '${dbName}' berhasil disiapkan.`);
  
  await connection.end();
}

setup().catch((err) => {
  console.error("❌ Gagal membuat database:", err);
  process.exit(1);
});
