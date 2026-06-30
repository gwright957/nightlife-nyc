import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { parse } from "csv-parse/sync";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, VenueType } from "@prisma/client";

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const CSV_PATH = path.join(__dirname, "..", "venues_geocoded.csv");

type CsvRow = {
  name: string;
  "whether its a bar or club": string;
  address: string;
  borough: string;
  "zip code": string;
  Latitude: string;
  Longitude: string;
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseVenueType(value: string): VenueType {
  return value.trim().toLowerCase() === "club" ? "club" : "bar";
}

async function main() {
  if (!fs.existsSync(CSV_PATH)) {
    throw new Error(`venues_geocoded.csv not found at ${CSV_PATH}`);
  }

  const csvText = fs.readFileSync(CSV_PATH, "utf-8");
  const rows = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as CsvRow[];

  let seeded = 0;
  let skipped = 0;

  for (const row of rows) {
    const lat = parseFloat(row.Latitude);
    const lng = parseFloat(row.Longitude);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      console.warn(`Skipping "${row.name}" — missing coordinates`);
      skipped++;
      continue;
    }

    const borough = row.borough?.trim() ?? "";
    const zip = row["zip code"]?.trim() ?? "";
    const fullAddress = `${row.address.trim()}, ${borough}, NY ${zip}`;

    await prisma.venue.upsert({
      where: { id: slugify(row.name) },
      update: {
        name: row.name.trim(),
        address: fullAddress,
        lat,
        lng,
        type: parseVenueType(row["whether its a bar or club"]),
      },
      create: {
        id: slugify(row.name),
        name: row.name.trim(),
        address: fullAddress,
        lat,
        lng,
        type: parseVenueType(row["whether its a bar or club"]),
      },
    });

    seeded++;
  }

  console.log(`Seeded ${seeded} venues from venues_geocoded.csv`);
  if (skipped > 0) {
    console.log(`Skipped ${skipped} rows without coordinates`);
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
