import { mysqlTable, int, varchar, text, timestamp, float, date } from 'drizzle-orm/mysql-core';
import { relations } from 'drizzle-orm';

export const users = mysqlTable('users', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: text('password').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const masterAset = mysqlTable('master_aset', {
  id: int('id').autoincrement().primaryKey(),
  idAset: varchar('id_aset', { length: 255 }).notNull().unique(),
  nama: varchar('nama', { length: 255 }),
  merek: varchar('merek', { length: 255 }),
  model: varchar('model', { length: 255 }),
  kategori: varchar('kategori', { length: 255 }),
  subKategori: varchar('sub_kategori', { length: 255 }),
  tipe: varchar('tipe', { length: 255 }),
  tglInstalasi: date('tgl_instalasi'),
  lokasiGedung: varchar('lokasi_gedung', { length: 255 }),
  lokasiLantai: varchar('lokasi_lantai', { length: 255 }),
  lokasiZona: varchar('lokasi_zona', { length: 255 }),
  kekritisan: varchar('kekritisan', { length: 50 }),
  status: varchar('status', { length: 50 }).notNull().default('Aktif'),
  statusJadwal: varchar('status_jadwal', { length: 255 }),
  lastPredictedAt: timestamp('last_predicted_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const asetKomplain = mysqlTable('aset_komplain', {
  id: int('id').autoincrement().primaryKey(),
  idAset: varchar('id_aset', { length: 255 }).notNull().references(() => masterAset.idAset),
  tanggalPerencanaan: date('tanggal_perencanaan'),
  tanggalPengerjaan: date('tanggal_pengerjaan'),
  tanggalSelesai: date('tanggal_selesai'),
  jenisKerusakan: varchar('jenis_kerusakan', { length: 255 }),
  severity: varchar('severity', { length: 50 }),
  severityScore: int('severity_score'),
  penyebab: text('penyebab'),
  biayaPerbaikan: float('biaya_perbaikan'),
  sparePartDigunakan: text('spare_part_digunakan'),
  teknisiPelaksana: varchar('teknisi_pelaksana', { length: 255 }),
});

// Reference table: avg replacement price per asset type, used for Avg_Biaya_Penggantian feature
export const katalogHarga = mysqlTable('katalog_harga', {
  tipe: varchar('tipe', { length: 255 }).primaryKey(),
  hargaBeli: float('harga_beli'),
});

export const chatMessage = mysqlTable('chat_messages', {
  id: int('id').autoincrement().primaryKey(),
  userId: int('user_id').notNull().references(() => users.id),
  sender: varchar('sender', { length: 255 }).notNull(),
  message: text('message').notNull(),
  url: varchar('url', { length: 255 }),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
});

export const userRelations = relations(users, ({ many }) => ({
  chatMessages: many(chatMessage),
}));

export const chatMessageRelations = relations(chatMessage, ({ one }) => ({
  user: one(users, { fields: [chatMessage.userId], references: [users.id] }),
}));

export const masterAsetRelations = relations(masterAset, ({ many }) => ({
  komplain: many(asetKomplain),
}));

export const asetKomplainRelations = relations(asetKomplain, ({ one }) => ({
  masterAset: one(masterAset, { fields: [asetKomplain.idAset], references: [masterAset.idAset] }),
}));
