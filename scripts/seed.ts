import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { db } from '../db';
import { masterAset, asetKomplain, katalogHarga, riwayatPenggantianAset } from '../db/schema';
import { sql } from 'drizzle-orm';

const BATCH = 500;
const PUBLIC = path.resolve(__dirname, '../public');

function readCsv(filename: string): Record<string, string>[] {
  const content = fs.readFileSync(path.join(PUBLIC, filename), 'utf-8');
  return parse(content, { columns: true, skip_empty_lines: true }) as Record<string, string>[];
}

function parseDate(val: string | undefined): Date | null {
  if (!val || val === 'NaT' || val.trim() === '') return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function parseFloat2(val: string | undefined): number | null {
  if (!val || val.trim() === '') return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

function parseInt2(val: string | undefined): number | null {
  if (!val || val.trim() === '') return null;
  const n = parseInt(val, 10);
  return isNaN(n) ? null : n;
}

async function insertBatches<T extends object>(
  table: Parameters<typeof db.insert>[0],
  rows: T[],
  label: string,
  updateSet: Record<string, ReturnType<typeof sql>>,
) {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    try {
      await db.insert(table).values(batch).onDuplicateKeyUpdate({ set: updateSet });
      inserted += batch.length;
    } catch (err) {
      console.error(`[${label}] batch error at offset ${i}:`, err);
    }
  }
  console.log(`[${label}] inserted ${inserted} / ${rows.length} rows`);
}

async function seedMasterAset() {
  const rows = readCsv('master_aset.csv').map((r) => ({
    idAset: parseInt2(r.id_aset)!,
    nama: r.nama || null,
    merek: r.merek || null,
    model: r.model || null,
    kategori: r.kategori || null,
    subKategori: r.sub_kategori || null,
    tipe: r.tipe || null,
    tglInstalasi: parseDate(r.tgl_instalasi),
    lokasiGedung: r.lokasi_gedung || null,
    lokasiLantai: r.lokasi_lantai || null,
    lokasiZona: r.lokasi_zona || null,
    kekritisan: r.kekritisan || null,
    status: r.status || 'Aktif',
    statusJadwal: null,
  }));
  await insertBatches(masterAset, rows, 'master_aset', { status: sql`VALUES(status)` });
}

async function seedKatalogHarga() {
  const rows = readCsv('katalog_harga.csv').map((r) => ({
    tipe: r.tipe,
    hargaBeli: parseFloat2(r.harga_beli),
  }));
  await insertBatches(katalogHarga, rows, 'katalog_harga', { hargaBeli: sql`VALUES(harga_beli)` });
}

async function seedAsetKomplain() {
  const masterIds = new Set(
    readCsv('master_aset.csv').map((r) => parseInt(r.id_aset, 10)),
  );
  
  const rows = readCsv('aset_komplain.csv').map((r) => ({
    idAset: parseInt2(r.id_aset)!,
    nama: r.nama || null,
    tanggalPerencanaan: parseDate(r.tanggal_perencanaan),
    tanggalPengerjaan: parseDate(r.tanggal_pengerjaan),
    tanggalSelesai: parseDate(r.tanggal_selesai),
    jenisKerusakan: r.jenis_kerusakan || null,
    severity: r.severity || null,
    severityScore: parseInt2(r.severity_score),
    penyebab: r.penyebab || null,
    biayaPerbaikan: parseFloat2(r.biaya_perbaikan),
    sparePartDigunakan: r.spare_part_digunakan || null,
    teknisiPelaksana: r.teknisi_pelaksana || null,
  }));

  const valid = rows.filter((r) => masterIds.has(r.idAset));
  const orphans = rows.length - valid.length;
  
  if (orphans > 0) {
    console.log(`[aset_komplain] skipping ${orphans} orphan rows`);
  }

  await insertBatches(asetKomplain, valid, 'aset_komplain', { id: sql`id` });
}

async function seedRiwayatPenggantianAset() {
  const masterIds = new Set(
    readCsv('master_aset.csv').map((r) => parseInt(r.id_aset, 10)),
  );
  
  const rows = readCsv('riwayat_penggantian_aset.csv')
    .map((r) => {
      const parsedBaru = parseInt2(r.id_aset_baru);
      const validIdBaru = parsedBaru !== null && masterIds.has(parsedBaru) ? parsedBaru : null;

      return {
        idAsetLama: parseInt2(r.id_aset_lama)!,
        namaAsetLama: r.nama_aset_lama || null,
        kategori: r.kategori || null,
        tipe: r.tipe || null,
        idAsetBaru: validIdBaru,
        tanggalPenggantian: parseDate(r.tanggal_penggantian),
        alasanPenggantian: r.alasan_penggantian || null,
        biayaPenggantian: parseFloat2(r.biaya_penggantian),
      };
    })
    .filter((r) => masterIds.has(r.idAsetLama));
    
  await insertBatches(riwayatPenggantianAset, rows, 'riwayat_penggantian_aset', { idAsetLama: sql`VALUES(id_aset_lama)` });
}

async function seed() {
  console.log('Starting PRISM database seed...\n');
  await seedMasterAset();
  await seedKatalogHarga();
  await seedAsetKomplain();
  await seedRiwayatPenggantianAset();
  console.log('\nSeed complete.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});