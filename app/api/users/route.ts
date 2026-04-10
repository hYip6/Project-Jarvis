import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { nowIso } from "@/lib/db-helpers";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get("ids");
    const db = await getDb();
    const users = db.collection("users");

    let query: Record<string, unknown> = {};
    if (idsParam) {
      const ids = idsParam
        .split(",")
        .map((id) => id.trim())
        .filter((id) => ObjectId.isValid(id))
        .map((id) => new ObjectId(id));
      query = { _id: { $in: ids } };
    }

    const rows = await users.find(query).limit(100).toArray();
    return NextResponse.json({
      users: rows.map((row) => ({
        ...row,
        _id: row._id.toString(),
      })),
    });
  } catch {
    return NextResponse.json({ error: "Failed to load users." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const sbuEmail = String(body.sbuEmail ?? "")
      .trim()
      .toLowerCase();
    const venmoHandle = String(body.venmoHandle ?? "").trim();
    const roles = Array.isArray(body.roles) ? body.roles : [];

    if (!name || !sbuEmail || !venmoHandle || roles.length === 0) {
      return NextResponse.json(
        { error: "name, sbuEmail, venmoHandle, and roles are required." },
        { status: 400 }
      );
    }

    const safeRoles = roles.filter(
      (role: unknown) => role === "requester" || role === "fulfiller"
    );

    if (safeRoles.length === 0) {
      return NextResponse.json(
        { error: "roles must include requester and/or fulfiller." },
        { status: 400 }
      );
    }

    const now = nowIso();
    const db = await getDb();
    const users = db.collection("users");

    const result = await users.findOneAndUpdate(
      { sbuEmail },
      {
        $set: {
          name,
          sbuEmail,
          venmoHandle,
          roles: safeRoles,
          isActive: true,
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true, returnDocument: "after", includeResultMetadata: false }
    );

    return NextResponse.json({
      user: result
        ? {
            ...result,
            _id: result._id.toString(),
          }
        : null,
    });
  } catch {
    return NextResponse.json({ error: "Failed to save user." }, { status: 500 });
  }
}
