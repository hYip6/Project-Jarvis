import { ObjectId } from "mongodb";

export function toObjectId(id: string) {
  if (!ObjectId.isValid(id)) {
    throw new Error("Invalid object id.");
  }
  return new ObjectId(id);
}

export function nowIso() {
  return new Date().toISOString();
}
