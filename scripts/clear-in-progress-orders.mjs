/**
 * Deletes every order that is not COMPLETED (PENDING, CLAIMED, PLACED, PICKED_UP).
 * Run: npm run clear:in-progress-orders
 */
import { MongoClient, ServerApiVersion } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB ?? "marketplace-arbitrage";

const IN_PROGRESS = ["PENDING", "CLAIMED", "PLACED", "PICKED_UP"];

if (!uri) {
  console.error("Missing MONGODB_URI. Use .env.local (see npm script).");
  process.exit(1);
}

async function main() {
  const client = new MongoClient(uri, {
    serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
  });
  await client.connect();
  const orders = client.db(dbName).collection("orders");

  const filter = { status: { $in: IN_PROGRESS } };
  const count = await orders.countDocuments(filter);
  console.log(`Found ${count} in-progress order(s) to delete.`);

  const result = await orders.deleteMany(filter);
  console.log(`Deleted ${result.deletedCount} order(s).`);

  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
