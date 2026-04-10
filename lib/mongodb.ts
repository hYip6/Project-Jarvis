import { MongoClient, ServerApiVersion } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB ?? "marketplace-arbitrage";

const globalWithMongo = globalThis as typeof globalThis & {
  _mongoClientPromise?: Promise<MongoClient>;
};

let clientPromise: Promise<MongoClient> | null = globalWithMongo._mongoClientPromise ?? null;

export async function getDb() {
  if (!uri) {
    throw new Error("Missing MONGODB_URI in environment variables.");
  }
  if (!clientPromise) {
    const client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });
    clientPromise = client.connect();
    globalWithMongo._mongoClientPromise = clientPromise;
  }
  const connectedClient = await clientPromise;
  return connectedClient.db(dbName);
}
