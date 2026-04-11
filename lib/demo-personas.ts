export const USER_STORAGE_KEY = "hackathon-user-v2";

export const DEMO_BOB_ID = "0000000000000000000000b1";
export const DEMO_ALICE_ID = "0000000000000000000000a1";
export const DEMO_CHARLIE_ID = "0000000000000000000000c1";
export const DEMO_DIANA_ID = "0000000000000000000000d1";
export const DEMO_ETHAN_ID = "0000000000000000000000e1";
export const DEMO_FIONA_ID = "0000000000000000000000f1";
export const DEMO_BOB_EMAIL = "bob@stonybrook.edu";
export const DEMO_ALICE_EMAIL = "alice@stonybrook.edu";

export type AppUser = {
  _id: string;
  name: string;
  sbuEmail: string;
  venmoHandle: string;
  year: string;
};

export type UserIndex = Record<string, { _id: string; name: string; venmoHandle: string }>;

export const BOB_USER: AppUser = {
  _id: DEMO_BOB_ID,
  name: "Bob (Demo)",
  sbuEmail: DEMO_BOB_EMAIL,
  venmoHandle: "@bob-venmo",
  year: "Freshman",
};

export const ALICE_USER: AppUser = {
  _id: DEMO_ALICE_ID,
  name: "Alice (Demo)",
  sbuEmail: DEMO_ALICE_EMAIL,
  venmoHandle: "@alice-venmo",
  year: "Senior",
};

export const DEMO_USER_LOOKUP: UserIndex = {
  [DEMO_BOB_ID]: {
    _id: DEMO_BOB_ID,
    name: BOB_USER.name,
    venmoHandle: BOB_USER.venmoHandle,
  },
  [DEMO_ALICE_ID]: {
    _id: DEMO_ALICE_ID,
    name: ALICE_USER.name,
    venmoHandle: ALICE_USER.venmoHandle,
  },
  [DEMO_CHARLIE_ID]: {
    _id: DEMO_CHARLIE_ID,
    name: "Charlie",
    venmoHandle: "@charlie-v",
  },
  [DEMO_DIANA_ID]: {
    _id: DEMO_DIANA_ID,
    name: "Diana",
    venmoHandle: "@diana-v",
  },
  [DEMO_ETHAN_ID]: {
    _id: DEMO_ETHAN_ID,
    name: "Ethan",
    venmoHandle: "@ethan-v",
  },
  [DEMO_FIONA_ID]: {
    _id: DEMO_FIONA_ID,
    name: "Fiona",
    venmoHandle: "@fiona-v",
  },
};

export function readStoredPersona(): AppUser {
  if (typeof window === "undefined") {
    return BOB_USER;
  }
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    if (!raw) {
      return BOB_USER;
    }
    const parsed = JSON.parse(raw) as { sbuEmail?: string };
    const email = String(parsed.sbuEmail ?? "")
      .trim()
      .toLowerCase();
    if (email === DEMO_ALICE_EMAIL) {
      return { ...ALICE_USER };
    }
    if (email === DEMO_BOB_EMAIL) {
      return { ...BOB_USER };
    }
  } catch {
    /* ignore */
  }
  return BOB_USER;
}
