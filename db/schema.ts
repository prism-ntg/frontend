import { mysqlTable, int, varchar, text, timestamp, float } from 'drizzle-orm/mysql-core';
import { relations } from 'drizzle-orm';

export const users = mysqlTable('users', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: text('password').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const predictions = mysqlTable('predictions', {
  id: int('id').autoincrement().primaryKey(),
  idAset: varchar('id_aset', { length: 255 }).notNull().references(() => mainData.idAset),
  tanggalInstalasi: timestamp('tanggal_instalasi'),
  kekritisanScore: float('kekritisan_score'),
  avgMaintenanceDelay: float('avg_maintenance_delay'),
  maxMaintenanceDelay: float('max_maintenance_delay'),
  totalDowntime: float('total_downtime'),
  avgDowntime: float('avg_downtime'),
  totalBiayaPerbaikan: float('total_biaya_perbaikan'),
  failureFrequency: float('failure_frequency'),
  peakSeverity: float('peak_severity'),
  avgBiayaPenggantian: float('avg_biaya_penggantian'),
  costRiskRatio: float('cost_risk_ratio'),
  umurAsetHari: int('umur_aset_hari'),
  targetFrekuensi: varchar('target_frekuensi', { length: 255 }),
});

export const mainData = mysqlTable('main_data', {
  id: int('id').autoincrement().primaryKey(),
  idAset: varchar('id_aset', { length: 255 }).notNull().unique(),
  kategori: varchar('kategori', { length: 255 }),
  subKategori: varchar('sub_kategori', { length: 255 }),
  tipe: varchar('tipe', { length: 255 }),
  jenisKerusakan: varchar('jenis_kerusakan', { length: 255 }),
  severity: varchar('severity', { length: 255 }),
  penyebab: text('penyebab'),
  biayaPerbaikan: int('biaya_perbaikan'),
  sparePartDigunakan: text('spare_part_digunakan'),
  lokasiGedung: varchar('lokasi_gedung', { length: 255 }),
  lokasiLantai: varchar('lokasi_lantai', { length: 255 }),
  lokasiZona: varchar('lokasi_zona', { length: 255 }),
});

export const mainDataRelations = relations(mainData, ({ many }) => ({
  predictions: many(predictions),
}));

export const predictionsRelations = relations(predictions, ({ one }) => ({
  mainData: one(mainData, {
    fields: [predictions.idAset],
    references: [mainData.idAset],
  }),
}));