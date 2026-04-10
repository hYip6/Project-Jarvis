/**
 * Removes specific test orders from MongoDB (by location + order details).
 * Run: npm run remove:demo-orders
 */
import { MongoClient, ServerApiVersion } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB ?? "marketplace-arbitrage";

if (!uri) {
  console.error("Missing MONGODB_URI. Run: npm run remove:demo-orders");
  process.exit(1);
}

/** Pairs to remove (trimmed details, case-insensitive) */
const TO_REMOVE = [
  { location: "Jasmine", detailsPattern: /^erere$/i },
  { location: "East Side Dining", detailsPattern: /^test$/i },
];

async function main() {
  const client = new MongoClient(uri, {
    serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
  });
  await client.connect();
  const orders = client.db(dbName).collection("orders");

  const orClauses = TO_REMOVE.map(({ location, detailsPattern }) => ({
    location,
    orderDetails: detailsPattern,
  }));

  const found = await orders.find({ $or: orClauses }).toArray();
  for (const doc of found) {
    console.log(
      `Will delete: ${doc._id} | ${doc.location} | "${doc.orderDetails}" | ${doc.status} | $${doc.originalPrice}`
    );
  }

  const result = await orders.deleteMany({ $or: orClauses });
  console.log(`\nDeleted ${result.deletedCount} order(s).`);

  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
