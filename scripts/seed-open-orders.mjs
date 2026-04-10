/**
 * Inserts sample PENDING orders for marketplace demos.
 * Run: npm run seed:open-orders
 * Requires MONGODB_URI (and optional MONGODB_DB) in .env.local — loaded via --env-file.
 */
import { MongoClient, ServerApiVersion } from "mongodb";

function nowIso() {
  return new Date().toISOString();
}

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB ?? "marketplace-arbitrage";

if (!uri) {
  console.error("Missing MONGODB_URI. Run: npm run seed:open-orders");
  process.exit(1);
}

const SEED_EMAIL = "seed.openorders@stonybrook.edu";
const SEED_TAG = "sample-open-orders";

const SAMPLES = [
  {
    location: "SAC Food Court",
    orderDetails: "Grilled chicken bowl, brown rice, black beans, mild salsa, no sour cream",
    originalPrice: 11.99,
    pickupWindow: "12:15",
  },
  {
    location: "Roth Café",
    orderDetails: "Turkey club on wheat, side of chips, iced tea",
    originalPrice: 9.5,
    pickupWindow: "17:30",
  },
  {
    location: "East Side Dining",
    orderDetails: "Cheese pizza slice x2, Caesar salad",
    originalPrice: 14.0,
    pickupWindow: "18:00",
  },
  {
    location: "Jasmine",
    orderDetails: "Orange chicken with steamed rice, egg roll",
    originalPrice: 12.25,
    pickupWindow: "12:45",
  },
  {
    location: "West Side Dining",
    orderDetails: "Veggie burger, fries, chocolate milk",
    originalPrice: 10.5,
    pickupWindow: "19:15",
  },
];

async function main() {
  const client = new MongoClient(uri, {
    serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
  });
  await client.connect();
  const db = client.db(dbName);
  const users = db.collection("users");
  const orders = db.collection("orders");

  const now = nowIso();

  await users.findOneAndUpdate(
    { sbuEmail: SEED_EMAIL },
    {
      $set: {
        name: "Demo Open Orders",
        sbuEmail: SEED_EMAIL,
        venmoHandle: "@demo-seed",
        roles: ["requester", "fulfiller"],
        isActive: true,
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  );

  const seedUser = await users.findOne({ sbuEmail: SEED_EMAIL });
  if (!seedUser) {
    throw new Error("Failed to upsert seed user");
  }
  const requesterId = seedUser._id;

  const removed = await orders.deleteMany({ seedSource: SEED_TAG });

  const docs = SAMPLES.map((s) => {
    const discountedPrice = Number((s.originalPrice * 0.5).toFixed(2));
    return {
      requesterId,
      fulfillerId: null,
      location: s.location,
      orderDetails: s.orderDetails,
      originalPrice: Number(s.originalPrice.toFixed(2)),
      discountPercent: 50,
      discountedPrice,
      status: "PENDING",
      pickupWindow: s.pickupWindow,
      proofType: "ORDER_NUMBER",
      proofValue: "",
      paymentMethod: "VENMO",
      paymentConfirmedByRequester: false,
      createdAt: now,
      claimedAt: null,
      placedAt: null,
      pickedUpAt: null,
      completedAt: null,
      updatedAt: now,
      seedSource: SEED_TAG,
    };
  });

  await orders.insertMany(docs);

  console.log(
    `Seed user: ${SEED_EMAIL} (${requesterId.toString()})\n` +
      `Removed ${removed.deletedCount} previous seed order(s).\n` +
      `Inserted ${docs.length} open (PENDING) orders.`
  );

  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
