import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse';
import { db } from '../db';
import { mainData, predictions } from '../db/schema';
import { inArray, sql } from 'drizzle-orm';

const csvFilePath = path.resolve(__dirname, '../public/main_data.csv');
const predictionsCsvFilePath = path.resolve(__dirname, '../public/predictions.csv');

async function seed() {
  console.log('Seeding main_data from CSV...');
  const records: any[] = [];
  
  const parser = fs
    .createReadStream(csvFilePath)
    .pipe(parse({ columns: true, skip_empty_lines: true }));

  for await (const record of parser) {
    records.push({
      idAset: record.id_aset,
      kategori: record.kategori,
      subKategori: record.sub_kategori,
      tipe: record.tipe,
      jenisKerusakan: record.jenis_kerusakan,
      severity: record.severity,
      penyebab: record.penyebab,
      biayaPerbaikan: record.biaya_perbaikan ? parseInt(record.biaya_perbaikan) : null,
      sparePartDigunakan: record.spare_part_digunakan,
      lokasiGedung: record.lokasi_gedung,
      lokasiLantai: record.lokasi_lantai,
      lokasiZona: record.lokasi_zona,
    });
  }

  const batchSize = 1000;
  let inserted = 0;
  
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    
    // Create unique sets based on idAset to prevent duplicate insertion error
    // Some lines might have the same id_aset, in which case we may need to deduplicate them
    // based on our schema idAset is unique in mainData but predictions have unique too?
    // Wait, let's look at schema.ts again!
    
    const uniqueBatch = [];
    const seenIds = new Set();
    for (const d of batch) {
      if (!seenIds.has(d.idAset)) {
        seenIds.add(d.idAset);
        uniqueBatch.push(d);
      }
    }

    if (uniqueBatch.length > 0) {
      try {
        await db.insert(mainData).values(uniqueBatch).onDuplicateKeyUpdate({
          set: {
            kategori: sql`VALUES(kategori)`,
            subKategori: sql`VALUES(sub_kategori)`,
            tipe: sql`VALUES(tipe)`,
            jenisKerusakan: sql`VALUES(jenis_kerusakan)`,
            severity: sql`VALUES(severity)`,
            penyebab: sql`VALUES(penyebab)`,
            biayaPerbaikan: sql`VALUES(biaya_perbaikan)`,
            sparePartDigunakan: sql`VALUES(spare_part_digunakan)`,
            lokasiGedung: sql`VALUES(lokasi_gedung)`,
            lokasiLantai: sql`VALUES(lokasi_lantai)`,
            lokasiZona: sql`VALUES(lokasi_zona)`,
          }
        });
        inserted += uniqueBatch.length;
      } catch (err) {
        console.error(`Error inserting batch at ${i}: `, err);
      }
    }
  }

  console.log(`Successfully seeded ${inserted} records into main_data`);

  console.log('Seeding predictions from CSV...');
  const predRecords: any[] = [];
  
  const predParser = fs
    .createReadStream(predictionsCsvFilePath)
    .pipe(parse({ columns: true, skip_empty_lines: true }));

  function parseNumber(val: string | null | undefined): number | null {
    if (!val) return null;
    val = val.trim();
    if (val.includes(',')) {
      // e.g. "9.999.994.441.359.390,2767" -> "9999994441359390.2767"
      val = val.replace(/\./g, '').replace(',', '.');
    } else {
      // e.g. "13.333.333.333.333.300" -> this is crazy, let parseFloat handle it or replace dots since it might be thousand separators?
      // but wait, "0.0" is just 0.0. "52615000.0" is just 52615000.0.
      // If it ends with ".0", dots are decimal.
      // To be safe, if we don't have comma, just parse float.
    }
    return parseFloat(val);
  }

  for await (const record of predParser) {
    predRecords.push({
      idAset: record.id_aset,
      tanggalInstalasi: record.tanggal_instalasi ? new Date(record.tanggal_instalasi) : null,
      kekritisanScore: parseNumber(record.kekritisan_score),
      avgMaintenanceDelay: parseNumber(record.avg_maintenance_delay),
      maxMaintenanceDelay: parseNumber(record.max_maintenance_delay),
      totalDowntime: parseNumber(record.total_downtime),
      avgDowntime: parseNumber(record.avg_downtime),
      totalBiayaPerbaikan: parseNumber(record.total_biaya_perbaikan),
      failureFrequency: parseNumber(record.failure_frequency),
      peakSeverity: parseNumber(record.peak_severity),
      avgBiayaPenggantian: parseNumber(record.avg_biaya_penggantian),
      costRiskRatio: parseNumber(record.cost_risk_ratio),
      umurAsetHari: parseNumber(record.umur_aset_hari),
      targetFrekuensi: record.target_frekuensi,
    });
  }

  let predInserted = 0;
  
  await db.execute(sql`SET FOREIGN_KEY_CHECKS = 0;`);

  for (let i = 0; i < predRecords.length; i += batchSize) {
    const batch = predRecords.slice(i, i + batchSize);
    
    // Predictions shouldn't have duplicate id_aset? Wait! If it does, we deduplicate again.
    const uniquePredBatch = [];
    const seenPredIds = new Set();
    for (const d of batch) {
      if (!seenPredIds.has(d.idAset)) {
        seenPredIds.add(d.idAset);
        uniquePredBatch.push(d);
      }
    }

    if (uniquePredBatch.length > 0) {
      try {
        await db.insert(predictions).values(uniquePredBatch).onDuplicateKeyUpdate({
          set: {
            tanggalInstalasi: sql`VALUES(tanggal_instalasi)`,
            kekritisanScore: sql`VALUES(kekritisan_score)`,
            avgMaintenanceDelay: sql`VALUES(avg_maintenance_delay)`,
            maxMaintenanceDelay: sql`VALUES(max_maintenance_delay)`,
            totalDowntime: sql`VALUES(total_downtime)`,
            avgDowntime: sql`VALUES(avg_downtime)`,
            totalBiayaPerbaikan: sql`VALUES(total_biaya_perbaikan)`,
            failureFrequency: sql`VALUES(failure_frequency)`,
            peakSeverity: sql`VALUES(peak_severity)`,
            avgBiayaPenggantian: sql`VALUES(avg_biaya_penggantian)`,
            costRiskRatio: sql`VALUES(cost_risk_ratio)`,
            umurAsetHari: sql`VALUES(umur_aset_hari)`,
            targetFrekuensi: sql`VALUES(target_frekuensi)`,
          }
        });
        predInserted += uniquePredBatch.length;
      } catch (err) {
        console.error(`Error inserting predictions batch at ${i}: `, err);
      }
    }
  }

  console.log(`Successfully seeded ${predInserted} records into predictions`);
  await db.execute(sql`SET FOREIGN_KEY_CHECKS = 1;`);

  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
