"""
Converts the raw XLSX datasets into CSV files for the Drizzle seed script.
Run from the frontend directory: python scripts/generate_csv.py
"""
import os
import sys
import pandas as pd

BASE = os.path.dirname(os.path.abspath(__file__))
DATASET_DIR = os.path.join(BASE, "..", "..", "api", "datasets")
PUBLIC_DIR = os.path.join(BASE, "..", "public")

os.makedirs(PUBLIC_DIR, exist_ok=True)

STATUS_MAP = {
    "Aktif": "Aktif",
    "Diganti": "Non-Aktif",
    "Rusak": "Non-Aktif",
    "Dihapus": "Non-Aktif",
}

SEVERITY_SCORE = {
    "Ringan": 1,
    "Sedang": 2,
    "Berat": 3,
    "Fatal": 4,
}

KEKRITISAN_SCORE = {
    "Minor": 1,
    "Major": 2,
    "Critical": 3,
}


def generate_master_aset():
    path = os.path.join(DATASET_DIR, "master_aset_enriched (2).xlsx")
    df = pd.read_excel(path)

    df["status"] = df["Status"].map(STATUS_MAP).fillna("Aktif")

    out = pd.DataFrame({
        "id_aset": df["Nama"],
        "nama": df["Nama"],
        "merek": df["Merek"],
        "model": df["Model"],
        "kategori": df["Kategori"],
        "sub_kategori": df["Sub Kategori"],
        "tipe": df["Tipe"],
        "tgl_instalasi": pd.to_datetime(df["Tanggal Instalasi"], dayfirst=True, errors="coerce").dt.strftime("%Y-%m-%d"),
        "lokasi_gedung": df["Lokasi Gedung"],
        "lokasi_lantai": df["Lokasi Lantai"].astype(str),
        "lokasi_zona": df["Lokasi Zona"],
        "kekritisan": df["Tingkat Kekritisan"],
        "status": df["status"],
    })

    dest = os.path.join(PUBLIC_DIR, "master_aset.csv")
    out.to_csv(dest, index=False)
    print(f"master_aset.csv: {len(out)} rows -> {dest}")


def generate_aset_komplain():
    path = os.path.join(DATASET_DIR, "aset_komplain_enriched (2).xlsx")
    df = pd.read_excel(path)

    def fmt_date(col):
        return pd.to_datetime(df[col], dayfirst=True, errors="coerce").dt.strftime("%Y-%m-%d")

    out = pd.DataFrame({
        "id_aset": df["Nama Aset"],
        "tanggal_perencanaan": fmt_date("Tanggal Perencanaan"),
        "tanggal_pengerjaan": fmt_date("Tanggal Pengerjaan"),
        "tanggal_selesai": fmt_date("Tanggal Selesai"),
        "jenis_kerusakan": df["Jenis Kerusakan"],
        "severity": df["Severity"],
        "severity_score": df["Severity"].map(SEVERITY_SCORE).fillna(1).astype(int),
        "penyebab": df["Penyebab"],
        "biaya_perbaikan": df["Biaya Perbaikan"],
        "spare_part_digunakan": df["Spare Part Digunakan"],
        "teknisi_pelaksana": df["Teknisi Pelaksana"],
    })

    dest = os.path.join(PUBLIC_DIR, "aset_komplain.csv")
    out.to_csv(dest, index=False)
    print(f"aset_komplain.csv: {len(out)} rows -> {dest}")


def generate_katalog_harga():
    path = os.path.join(DATASET_DIR, "riwayat_penggantian_aset (1).xlsx")
    df = pd.read_excel(path)

    katalog = (
        df.groupby("Tipe")["Biaya Penggantian"]
        .mean()
        .reset_index()
        .rename(columns={"Tipe": "tipe", "Biaya Penggantian": "harga_beli"})
    )

    dest = os.path.join(PUBLIC_DIR, "katalog_harga.csv")
    katalog.to_csv(dest, index=False)
    print(f"katalog_harga.csv: {len(katalog)} rows -> {dest}")


if __name__ == "__main__":
    print("Generating CSV files from XLSX datasets...")
    generate_master_aset()
    generate_aset_komplain()
    generate_katalog_harga()
    print("Done.")
