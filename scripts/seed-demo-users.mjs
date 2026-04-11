/**
 * Upserts demo users with fixed _id values (must match app/page.tsx DEMO_BOB_ID / DEMO_ALICE_ID).
 * Passwords: alice123 / bob123 (for optional /api/auth/login if you use it).
 * Run: npm run seed:demo-users
 */
import { randomBytes, scrypt } from "crypto";
import { promisify } from "util";
import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";

const scryptAsync = promisify(scrypt);

async function hashPassword(plain) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scryptAsync(plain, salt, 64);
  return `${salt}:${derived.toString("hex")}`;
}

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB ?? "marketplace-arbitrage";

if (!uri) {
  console.error("Missing MONGODB_URI. Run with: npm run seed:demo-users");
  process.exit(1);
}

const now = new Date().toISOString();

const BOB_ID = new ObjectId("0000000000000000000000b1");
const ALICE_ID = new ObjectId("0000000000000000000000a1");

const DEMO_USERS = [
  {
    _id: ALICE_ID,
    sbuEmail: "alice@stonybrook.edu",
    password: "alice123",
    name: "Alice (Demo)",
    venmoHandle: "@alice-venmo",
    year: "Senior",
  },
  {
    _id: BOB_ID,
    sbuEmail: "bob@stonybrook.edu",
    password: "bob123",
    name: "Bob (Demo)",
    venmoHandle: "@bob-venmo",
    year: "Freshman",
  },
];

async function main() {
  const client = new MongoClient(uri, {
    serverApi: { version: ServerApiVersion.v1, strict: false, deprecationErrors: false },
    family: 4,
  });
  await client.connect();
  const users = client.db(dbName).collection("users");

  for (const u of DEMO_USERS) {
    const passwordHash = await hashPassword(u.password);
    await users.replaceOne(
      { _id: u._id },
      {
        _id: u._id,
        name: u.name,
        sbuEmail: u.sbuEmail,
        venmoHandle: u.venmoHandle,
        year: u.year,
        roles: ["requester", "fulfiller"],
        isActive: true,
        passwordHash,
        createdAt: now,
        updatedAt: now,
      },
      { upsert: true }
    );
    console.log(`Seeded: ${u.sbuEmail} _id=${u._id.toString()} (password: ${u.password})`);
  }

  await client.close();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
