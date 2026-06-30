import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";

dotenv.config();

const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN;
const DEFAULT_DELAY_MS = 150;

// NYC bounding box: minLon,minLat,maxLon,maxLat
const NYC_BBOX = "-74.26,40.49,-73.70,40.92";
// Midtown Manhattan — bias results toward NYC
const NYC_PROXIMITY = "-73.9857,40.7484";

const LAT_COL = "Latitude";
const LNG_COL = "Longitude";

type VenueRow = Record<string, string>;

interface MapboxFeature {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    coordinates?: { latitude?: number; longitude?: number };
  };
}

interface MapboxResponse {
  features?: MapboxFeature[];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveInputPath(): string {
  const cliPath = process.argv[2];
  if (cliPath) {
    return path.resolve(cliPath);
  }
  if (process.env.VENUE_CSV_INPUT) {
    return path.resolve(process.env.VENUE_CSV_INPUT);
  }
  throw new Error(
    "No input CSV specified. Pass a path as the first argument or set VENUE_CSV_INPUT in .env"
  );
}

function buildQuery(row: VenueRow): string {
  const address = row.address?.trim() ?? "";
  const borough = row.borough?.trim() ?? "";
  const zip = row["zip code"]?.trim() ?? "";
  return `${address}, ${borough}, NY ${zip}`;
}

function extractCoordinates(feature: MapboxFeature): { lat: number; lng: number } | null {
  const props = feature.properties?.coordinates;
  if (props?.latitude != null && props?.longitude != null) {
    return { lat: props.latitude, lng: props.longitude };
  }

  const coords = feature.geometry?.coordinates;
  if (coords && coords.length >= 2) {
    return { lng: coords[0], lat: coords[1] };
  }

  return null;
}

async function geocode(query: string): Promise<{ lat: number; lng: number } | null> {
  const params = new URLSearchParams({
    q: query,
    access_token: MAPBOX_ACCESS_TOKEN!,
    country: "US",
    proximity: NYC_PROXIMITY,
    bbox: NYC_BBOX,
    limit: "1",
  });

  const url = `https://api.mapbox.com/search/geocode/v6/forward?${params.toString()}`;
  const response = await fetch(url);

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Mapbox API error ${response.status}: ${body}`);
  }

  const data = (await response.json()) as MapboxResponse;
  const top = data.features?.[0];
  if (!top) return null;

  return extractCoordinates(top);
}

async function main() {
  if (!MAPBOX_ACCESS_TOKEN) {
    console.error("Missing MAPBOX_ACCESS_TOKEN in backend/.env");
    process.exit(1);
  }

  const inputPath = resolveInputPath();
  if (!fs.existsSync(inputPath)) {
    console.error(`Input file not found: ${inputPath}`);
    process.exit(1);
  }

  const outputPath = path.join(path.dirname(inputPath), "venues_geocoded.csv");
  const delayMs = Number(process.env.GEOCODE_DELAY_MS ?? DEFAULT_DELAY_MS);

  const csvText = fs.readFileSync(inputPath, "utf-8");
  const rows = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  }) as VenueRow[];

  const columns = Object.keys(rows[0] ?? {});
  if (!columns.includes(LAT_COL) || !columns.includes(LNG_COL)) {
    console.error(`CSV must include "${LAT_COL}" and "${LNG_COL}" columns`);
    process.exit(1);
  }

  console.log(`Geocoding ${rows.length} venues from:\n  ${inputPath}`);
  console.log(`Output will be written to:\n  ${outputPath}\n`);

  let geocoded = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const name = row.name?.trim() ?? `(row ${i + 2})`;
    const existingLat = row[LAT_COL]?.trim();
    const existingLng = row[LNG_COL]?.trim();

    if (existingLat && existingLng) {
      skipped++;
      continue;
    }

    const query = buildQuery(row);
    process.stdout.write(`[${i + 1}/${rows.length}] ${name} ... `);

    try {
      const coords = await geocode(query);
      if (!coords) {
        failed++;
        console.log("FAILED (no result)");
        console.error(`  ⚠ Could not geocode: "${name}" — ${query}`);
      } else {
        row[LAT_COL] = String(coords.lat);
        row[LNG_COL] = String(coords.lng);
        geocoded++;
        console.log(`OK (${coords.lat}, ${coords.lng})`);
      }
    } catch (error) {
      failed++;
      console.log("FAILED (API error)");
      console.error(
        `  ⚠ Error geocoding "${name}" — ${query}:`,
        error instanceof Error ? error.message : error
      );
    }

    if (i < rows.length - 1) {
      await sleep(delayMs);
    }
  }

  const outputCsv = stringify(rows, {
    header: true,
    columns,
  });
  fs.writeFileSync(outputPath, outputCsv, "utf-8");

  console.log("\nDone.");
  console.log(`  Geocoded: ${geocoded}`);
  console.log(`  Skipped (already had coords): ${skipped}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Output: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
