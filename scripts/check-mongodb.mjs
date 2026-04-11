/**
 * Test Atlas connectivity with the same options as the app (IPv4, server API).
 * Run: npm run check:mongodb
 */
import { MongoClient, ServerApiVersion } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB ?? "marketplace-arbitrage";

if (!uri) {
  console.error("Missing MONGODB_URI. Use: npm run check:mongodb (loads .env.local)");
  process.exit(1);
}

async function main() {
  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: false,
      deprecationErrors: false,
    },
    family: 4,
    serverSelectionTimeoutMS: 15_000,
  });
  try {
    await client.connect();
    await client.db(dbName).command({ ping: 1 });
    console.log("OK: Connected to MongoDB Atlas and pinged database:", dbName);
  } catch (err) {
    const msg = String(err?.message ?? err);
    console.error("FAILED:", msg);
    const lower = msg.toLowerCase();
    if (lower.includes("querysrv") || lower.includes("econnrefused")) {
      console.error("\nThis error is DNS for mongodb+srv:// (SRV lookup was refused or blocked).");
      console.error("Try, in order:");
      console.error("  A. Turn VPN off, or try phone hotspot / another Wi‑Fi.");
      console.error("  B. macOS: System Settings → Network → your network → Details → DNS → add 1.1.1.1 and 8.8.8.8.");
      console.error("  C. In Terminal:  nslookup -type=SRV _mongodb._tcp.cluster0.mgsqgaz.mongodb.net");
      console.error("     If that fails, your resolver is blocking SRV queries.");
      console.error("  D. Atlas → Database → Connect → Drivers: turn OFF “Use SRV connection string” (if shown)");
      console.error("     and use the mongodb://… (standard) URI in MONGODB_URI instead of mongodb+srv://…");
    }
    console.error("\nOther typical fixes:");
    console.error("  1. Atlas → Network Access → Add Current IP or 0.0.0.0/0 (dev only)");
    console.error("  2. Fresh URI from Atlas → Connect; URL-encode special chars in the DB password");
    process.exit(1);
  } finally {
    await client.close().catch(() => {});
  }
}

main();
