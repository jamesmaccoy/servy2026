import { initializeApp, cert, getApps } from "firebase-admin";
import { getFirestore as getFirestoreAdmin } from "firebase-admin/firestore";
import * as fs from "fs";
import * as path from "path";

let app: any;
let cachedProjectId: string | null = null;
let isMockMode = false;

const MOCK_DB_PATH = process.env.VERCEL
  ? path.join("/tmp", "db-mock.json")
  : path.join(process.cwd(), "db-mock.json");

// Default initial data for mock DB
const DEFAULT_MOCK_DATA = {
  properties: [
    { id: "shack", title: "The Shack", slug: "the-shack", basePricePerNight: 1500 },
    { id: "cottage", title: "The Cottage", slug: "the-cottage", basePricePerNight: 1200 }
  ],
  packages: [
    { id: "shack_stack", propertyId: "shack", price: 8500, name: "Three nights - The Shack", description: "Three night stack booking at the beautiful Llandudno Shack." },
    { id: "book_an_entire_week", propertyId: "shack", price: 18000, name: "A week at The Shack", description: "Enjoy a full seven-day retreat at The Shack." },
    { id: "long_weekend_at_the_Cottage", propertyId: "cottage", price: 9500, name: "Three nights - The Cottage", description: "A cozy 3-night weekend getaway at Llandudno Cottage." },
    { id: "entire_week_at_the_cottage", propertyId: "cottage", price: 20000, name: "Seven nights - The Cottage", description: "A full week of peace and relaxation at Llandudno Cottage." }
  ],
  bookings: []
};

// Read local JSON database
function readMockDb(): any {
  try {
    if (fs.existsSync(MOCK_DB_PATH)) {
      const content = fs.readFileSync(MOCK_DB_PATH, "utf8");
      const parsed = JSON.parse(content);
      // Migrate legacy posts key to properties key on the fly if needed
      if (!parsed.properties && parsed.posts) {
        parsed.properties = parsed.posts;
        delete parsed.posts;
        writeMockDb(parsed);
      }
      return parsed;
    }
  } catch (err: any) {
    console.error("[Mock DB] Failed to read db-mock.json:", err.message);
  }
  // Initialize file if not present
  writeMockDb(DEFAULT_MOCK_DATA);
  return DEFAULT_MOCK_DATA;
}

// Write local JSON database
function writeMockDb(data: any) {
  try {
    fs.writeFileSync(MOCK_DB_PATH, JSON.stringify(data, null, 2), "utf8");
  } catch (err: any) {
    console.error("[Mock DB] Failed to write to db-mock.json:", err.message);
  }
}

export function getFirestore(): any {
  if (isMockMode) return null;

  if (!app) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!raw) {
      console.warn("⚠️ FIREBASE_SERVICE_ACCOUNT_JSON is not set. Operating in MOCK MODE (db-mock.json).");
      isMockMode = true;
      return null;
    }

    const trimmed = raw.trim();
    let credentials;
    try {
      credentials = JSON.parse(trimmed);
    } catch (err: any) {
      console.error("❌ Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON. Falling back to MOCK MODE.", err.message);
      isMockMode = true;
      return null;
    }

    try {
      const activeApps = getApps();
      if (activeApps.length > 0) {
        app = activeApps[0];
      } else {
        app = initializeApp({
          credential: cert(credentials),
          projectId: credentials.project_id,
        });
      }
      cachedProjectId = credentials.project_id || null;
    } catch (err: any) {
      console.error("❌ Failed to initialize Firebase Admin SDK. Falling back to MOCK MODE.", err.message);
      isMockMode = true;
      return null;
    }
  }
  return getFirestoreAdmin();
}

export function getProjectId(): string {
  getFirestore();
  if (isMockMode) return "mock-project-id";
  return cachedProjectId || "shack-30405";
}

// ==========================================
// PROPERTIES / POSTS CRUD
// ==========================================

export async function createProperty(data: {
  id?: string;
  title: string;
  name?: string;
  slug: string;
  basePricePerNight: number;
  airbnbCalendarUrl?: string;
  googleCalendarUrl?: string;
  hostId?: string;
  description?: string;
  images?: string[];
  createdAt?: string;
  updatedAt?: string;
  bookingType?: string;
  slots?: string[];
  location?: string;
}): Promise<any> {
  const db = getFirestore();
  const id = data.id || data.slug.trim().toLowerCase();
  const resolvedTitle = data.title || data.name || "";
  const resolvedName = data.name || data.title || "";
  const now = new Date().toISOString();

  // Load existing property if it exists to preserve createdAt or hostId
  let existing: any = null;
  if (isMockMode || !db) {
    const dbData = readMockDb();
    existing = (dbData.properties || []).find((p: any) => p.id === id);
  } else {
    try {
      const doc = await db.collection("properties").doc(id).get();
      if (doc.exists) {
        existing = doc.data();
      }
    } catch (_) {}
  }

  const propertyRecord = {
    ...data,
    id,
    title: resolvedTitle,
    name: resolvedName,
    hostId: data.hostId || existing?.hostId || "mock_admin_example_com",
    description: data.description || existing?.description || "",
    images: data.images || existing?.images || [],
    location: data.location || existing?.location || "",
    airbnbCalendarUrl: data.airbnbCalendarUrl || existing?.airbnbCalendarUrl || "",
    googleCalendarUrl: data.googleCalendarUrl || existing?.googleCalendarUrl || "",
    createdAt: existing?.createdAt || data.createdAt || now,
    updatedAt: now
  };

  if (isMockMode || !db) {
    const dbData = readMockDb();
    dbData.properties = dbData.properties || [];
    const index = dbData.properties.findIndex((p: any) => p.id === id);
    if (index >= 0) {
      dbData.properties[index] = propertyRecord;
    } else {
      dbData.properties.push(propertyRecord);
    }
    writeMockDb(dbData);
    return propertyRecord;
  }

  await db.collection("properties").doc(id).set(propertyRecord);
  return propertyRecord;
}

function sanitizeImageUrl(imgUrl: string): string {
  if (typeof imgUrl !== "string") return imgUrl;

  let publicDomain = process.env.R2_PUBLIC_DOMAIN || "https://pub-dd60f01f0434b933614f132cee2d1e61.r2.dev";
  
  if (publicDomain.includes("r2.cloudflarestorage.com")) {
    const match = publicDomain.match(/https?:\/\/([^.]+)\.r2\.cloudflarestorage\.com/);
    if (match && match[1]) {
      publicDomain = `https://pub-${match[1]}.r2.dev`;
    } else {
      publicDomain = "https://pub-dd60f01f0434b933614f132cee2d1e61.r2.dev";
    }
  }

  if (publicDomain.endsWith("/")) {
    publicDomain = publicDomain.slice(0, -1);
  }

  let cleaned = imgUrl;

  const s3Pattern = /https?:\/\/[^.]+\.r2\.cloudflarestorage\.com(?:\/[^/]+)?\//;
  if (s3Pattern.test(cleaned)) {
    const hostsIndex = cleaned.indexOf("/hosts/");
    if (hostsIndex !== -1) {
      cleaned = publicDomain + cleaned.substring(hostsIndex);
    } else {
      cleaned = cleaned.replace(s3Pattern, publicDomain + "/");
    }
  }

  if (cleaned.includes(".r2.dev/")) {
    const r2devMatch = cleaned.match(/https?:\/\/[^.]+\.r2\.dev/);
    if (r2devMatch) {
      const matchedDomain = r2devMatch[0];
      const rest = cleaned.substring(matchedDomain.length);
      const bucket = process.env.R2_BUCKET || "simpleplek";
      const bucketPrefix = `/${bucket}/`;
      if (rest.startsWith(bucketPrefix)) {
        cleaned = matchedDomain + rest.substring(bucketPrefix.length - 1);
      }
    }
  }

  return cleaned;
}

function cleanPropertyDoc(docData: any, id: string): any {
  if (!docData) return null;
  const images = docData.images || [];
  const cleanImages = images.map((img: string) => sanitizeImageUrl(img));
  return {
    hostId: "mock_admin_example_com",
    ...docData,
    id: docData.id || id,
    images: cleanImages
  };
}

export async function listProperties(hostId?: string): Promise<any[]> {
  const db = getFirestore();

  if (isMockMode || !db) {
    const dbData = readMockDb();
    const list = dbData.properties || [];
    const normalized = list.map((p: any) => cleanPropertyDoc(p, p.id));
    if (hostId) {
      return normalized.filter((p: any) => p.hostId === hostId);
    }
    return normalized;
  }

  try {
    let query: any = db.collection("properties");
    if (hostId) {
      query = query.where("hostId", "==", hostId);
    }
    const snap = await query.get();
    return snap.docs.map((doc: any) => cleanPropertyDoc(doc.data(), doc.id));
  } catch (err) {
    console.error("[Firebase] listProperties error:", err);
    const list = readMockDb().properties || [];
    const normalized = list.map((p: any) => cleanPropertyDoc(p, p.id));
    if (hostId) {
      return normalized.filter((p: any) => p.hostId === hostId);
    }
    return normalized;
  }
}

export async function getProperty(idOrSlug: string): Promise<any> {
  const db = getFirestore();
  const target = idOrSlug.trim();

  if (isMockMode || !db) {
    const dbData = readMockDb();
    const props = dbData.properties || [];
    const p = props.find((p: any) => p.id === target || p.slug === target) || null;
    return p ? cleanPropertyDoc(p, p.id) : null;
  }

  try {
    // Try by ID first
    let doc = await db.collection("properties").doc(target).get();
    if (doc.exists) return cleanPropertyDoc(doc.data(), doc.id);

    // If not found, query by slug
    const snap = await db.collection("properties").where("slug", "==", target).limit(1).get();
    if (!snap.empty) return cleanPropertyDoc(snap.docs[0].data(), snap.docs[0].id);
  } catch (err) {
    console.warn(`[Firebase] Failed to query property "${target}":`, err);
  }

  return null;
}

export async function deleteProperty(id: string): Promise<boolean> {
  const db = getFirestore();
  const targetId = id.trim();

  if (isMockMode || !db) {
    const dbData = readMockDb();
    dbData.properties = dbData.properties || [];
    dbData.packages = dbData.packages || [];
    
    const initialLength = dbData.properties.length;
    dbData.properties = dbData.properties.filter((p: any) => p.id !== targetId);
    
    // Cascade delete packages associated with this property
    dbData.packages = dbData.packages.filter((pkg: any) => pkg.propertyId !== targetId);
    
    writeMockDb(dbData);
    return dbData.properties.length < initialLength;
  }

  try {
    // Delete property document
    await db.collection("properties").doc(targetId).delete();
    
    // Delete packages associated with this property
    const packagesSnap = await db.collection("packages").where("propertyId", "==", targetId).get();
    if (!packagesSnap.empty) {
      const batch = db.batch();
      packagesSnap.docs.forEach((doc: any) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    }
    return true;
  } catch (err) {
    console.error(`[Firebase] deleteProperty error for id ${targetId}:`, err);
    return false;
  }
}


// ==========================================
// PACKAGES CRUD
// ==========================================

export async function createPackage(data: { id?: string; propertyId: string; name: string; price: number; description: string; multiplier?: number; baseRate?: number; yocoId?: string; category?: string; isEnabled?: boolean }): Promise<any> {
  const db = getFirestore();
  const id = data.id || `pkg_${Math.random().toString(36).substring(2, 11)}`;
  
  // Format for Yoco & Firebase compatibility
  const packageRecord = {
    multiplier: 1.0,
    baseRate: 0,
    yocoId: id,
    category: "standard",
    isEnabled: true,
    ...data,
    id
  };

  if (isMockMode || !db) {
    const dbData = readMockDb();
    const index = dbData.packages.findIndex((p: any) => p.id === id);
    if (index >= 0) {
      dbData.packages[index] = packageRecord;
    } else {
      dbData.packages.push(packageRecord);
    }
    writeMockDb(dbData);
    return packageRecord;
  }

  await db.collection("packages").doc(id).set(packageRecord);
  return packageRecord;
}

export async function getPackage(type: string): Promise<any> {
  const db = getFirestore();
  
  if (isMockMode || !db) {
    const cleanType = type.trim();
    const dbData = readMockDb();
    return dbData.packages.find((p: any) => p.id === cleanType) || null;
  }

  const candidates: string[] = [];
  if (typeof type === "string") {
    const trimmed = type.trim();
    candidates.push(type, trimmed, ` ${trimmed}`);
  } else if (type != null) {
    candidates.push(String(type));
  }

  const seen = new Set<string>();
  for (const id of candidates) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    try {
      const doc = await db.collection("packages").doc(id).get();
      if (doc.exists) return doc.data();
    } catch (err) {
      console.warn(`[Firebase] Failed to query package ID "${id}":`, err);
    }
  }

  return null;
}

export async function listPackages(propertyId?: string): Promise<any[]> {
  const db = getFirestore();

  if (isMockMode || !db) {
    const dbData = readMockDb();
    if (propertyId) {
      return dbData.packages.filter((p: any) => p.propertyId === propertyId);
    }
    return dbData.packages;
  }

  try {
    let query: any = db.collection("packages");
    if (propertyId) {
      query = query.where("propertyId", "==", propertyId);
    }
    const snap = await query.get();
    return snap.docs.map((doc: any) => doc.data());
  } catch (err) {
    console.error("[Firebase] listPackages error:", err);
    const mockPkgs = readMockDb().packages;
    if (propertyId) {
      return mockPkgs.filter((p: any) => p.propertyId === propertyId);
    }
    return mockPkgs;
  }
}

export async function listPackageDocIds(limit = 10): Promise<string[]> {
  const db = getFirestore();
  if (isMockMode || !db) {
    const dbData = readMockDb();
    return dbData.packages.map((p: any) => p.id).slice(0, limit);
  }

  try {
    const snap = await db.collection("packages").limit(limit).get();
    return snap.docs.map((d: any) => d.id);
  } catch (err) {
    console.error("[Firebase] listPackageDocIds error:", err);
    return readMockDb().packages.map((p: any) => p.id).slice(0, limit);
  }
}

export async function deletePackage(id: string): Promise<boolean> {
  const db = getFirestore();
  const targetId = id.trim();

  if (isMockMode || !db) {
    const dbData = readMockDb();
    dbData.packages = dbData.packages || [];
    
    const initialLength = dbData.packages.length;
    dbData.packages = dbData.packages.filter((pkg: any) => pkg.id !== targetId);
    
    writeMockDb(dbData);
    return dbData.packages.length < initialLength;
  }

  try {
    await db.collection("packages").doc(targetId).delete();
    return true;
  } catch (err) {
    console.error(`[Firebase] deletePackage error for id ${targetId}:`, err);
    return false;
  }
}


// ==========================================
// BOOKINGS CRUD
// ==========================================

export async function createBooking(data: { propertyId: string; packageId: string | null; customerName: string; customerEmail: string; fromDate: string; toDate: string; total: number; paymentStatus?: string }): Promise<any> {
  const db = getFirestore();
  const id = `bk_${Math.random().toString(36).substring(2, 11)}`;
  const bookingRecord = {
    paymentStatus: "pending",
    token: Math.random().toString(36).substring(2, 15),
    ...data,
    id
  };

  if (isMockMode || !db) {
    const dbData = readMockDb();
    dbData.bookings.push(bookingRecord);
    writeMockDb(dbData);
    return bookingRecord;
  }

  await db.collection("bookings").doc(id).set(bookingRecord);
  return bookingRecord;
}

export async function listBookings(propertyId?: string): Promise<any[]> {
  const db = getFirestore();

  if (isMockMode || !db) {
    const dbData = readMockDb();
    if (propertyId) {
      return dbData.bookings.filter((b: any) => b.propertyId === propertyId);
    }
    return dbData.bookings;
  }

  try {
    let query: any = db.collection("bookings");
    if (propertyId) {
      query = query.where("propertyId", "==", propertyId);
    }
    const snap = await query.get();
    return snap.docs.map((doc: any) => doc.data());
  } catch (err) {
    console.error("[Firebase] listBookings error:", err);
    const mockBks = readMockDb().bookings;
    if (propertyId) {
      return mockBks.filter((b: any) => b.propertyId === propertyId);
    }
    return mockBks;
  }
}

export async function updateBookingStatus(id: string, paymentStatus: string): Promise<boolean> {
  const db = getFirestore();
  if (isMockMode || !db) {
    const dbData = readMockDb();
    const index = dbData.bookings.findIndex((b: any) => b.id === id);
    if (index >= 0) {
      dbData.bookings[index].paymentStatus = paymentStatus;
      writeMockDb(dbData);
      return true;
    }
    return false;
  }
  try {
    await db.collection("bookings").doc(id).update({ paymentStatus });
    return true;
  } catch (err) {
    console.error(`[Firebase] updateBookingStatus error for id ${id}:`, err);
    // Fallback locally
    const dbData = readMockDb();
    const index = dbData.bookings.findIndex((b: any) => b.id === id);
    if (index >= 0) {
      dbData.bookings[index].paymentStatus = paymentStatus;
      writeMockDb(dbData);
      return true;
    }
    return false;
  }
}

export async function saveUserDates(uid: string, fromDate: string, toDate: string): Promise<any> {
  const db = getFirestore();
  const dateRecord = { fromDate, toDate };

  if (isMockMode || !db) {
    const dbData = readMockDb();
    dbData.userDates = dbData.userDates || {};
    dbData.userDates[uid] = dateRecord;
    writeMockDb(dbData);
    return dateRecord;
  }

  await db.collection("users").doc(uid).set(dateRecord, { merge: true });
  return dateRecord;
}

export async function getUserDates(uid: string): Promise<any | null> {
  const db = getFirestore();

  if (isMockMode || !db) {
    const dbData = readMockDb();
    dbData.userDates = dbData.userDates || {};
    return dbData.userDates[uid] || null;
  }

  try {
    const doc = await db.collection("users").doc(uid).get();
    if (doc.exists) {
      const data = doc.data();
      if (data?.fromDate && data?.toDate) {
        return { fromDate: data.fromDate, toDate: data.toDate };
      }
    }
  } catch (err) {
    console.error("[Firebase] getUserDates error:", err);
  }
  return null;
}

export async function isUserAdmin(uid: string, email?: string | null): Promise<boolean> {
  // Predefined admin emails
  const adminEmails = [
    "thankyou.digital@gmail.com",
    "admin@llandudnostays.co.za",
    "jmaclachlan@gmail.com",
    "admin@example.com"
  ];
  
  if (email && adminEmails.includes(email.toLowerCase())) {
    return true;
  }
  if (email && (email.toLowerCase().startsWith("admin@") || email.toLowerCase().startsWith("admin+"))) {
    return true;
  }

  const db = getFirestore();
  if (isMockMode || !db) {
    const dbData = readMockDb();
    // Allow local mock users with emails containing "admin" to be admin automatically
    if (email && email.toLowerCase().includes("admin")) {
      return true;
    }
    const userProfiles = dbData.userProfiles || {};
    return !!userProfiles[uid]?.isAdmin;
  }

  try {
    const doc = await db.collection("users").doc(uid).get();
    if (doc.exists) {
      const data = doc.data();
      return !!data.isAdmin;
    }
  } catch (err) {
    console.error("[Firebase] isUserAdmin error:", err);
  }
  return false;
}

// ==========================================
// ESTIMATES CRUD
// ==========================================

export async function createEstimate(data: { propertyId: string; packageId: string | null; customerName: string; customerEmail: string; customerId: string; fromDate: string; toDate: string; total: number; paymentStatus?: string }): Promise<any> {
  const db = getFirestore();
  const id = `est_${Math.random().toString(36).substring(2, 11)}`;
  const token = Math.random().toString(36).substring(2, 12);
  const estimateRecord = {
    paymentStatus: "pending",
    token,
    guests: [],
    createdAt: new Date().toISOString(),
    ...data,
    id
  };

  if (isMockMode || !db) {
    const dbData = readMockDb();
    dbData.estimates = dbData.estimates || [];
    dbData.estimates.push(estimateRecord);
    writeMockDb(dbData);
    return estimateRecord;
  }

  await db.collection("estimates").doc(id).set(estimateRecord);
  return estimateRecord;
}

export async function getEstimate(id: string): Promise<any | null> {
  const db = getFirestore();
  if (isMockMode || !db) {
    const dbData = readMockDb();
    const estimates = dbData.estimates || [];
    return estimates.find((e: any) => e.id === id) || null;
  }
  try {
    const doc = await db.collection("estimates").doc(id).get();
    if (doc.exists) return doc.data();
  } catch (err) {
    console.error(`[Firebase] getEstimate error for id ${id}:`, err);
  }
  return null;
}

export async function getEstimateByToken(token: string): Promise<any | null> {
  const db = getFirestore();
  if (isMockMode || !db) {
    const dbData = readMockDb();
    const estimates = dbData.estimates || [];
    return estimates.find((e: any) => e.token === token) || null;
  }
  try {
    const snap = await db.collection("estimates").where("token", "==", token).limit(1).get();
    if (!snap.empty) return snap.docs[0].data();
  } catch (err) {
    console.error(`[Firebase] getEstimateByToken error:`, err);
  }
  return null;
}

export async function updateEstimateStatus(id: string, paymentStatus: string): Promise<boolean> {
  const db = getFirestore();
  if (isMockMode || !db) {
    const dbData = readMockDb();
    dbData.estimates = dbData.estimates || [];
    const index = dbData.estimates.findIndex((e: any) => e.id === id);
    if (index >= 0) {
      dbData.estimates[index].paymentStatus = paymentStatus;
      writeMockDb(dbData);
      return true;
    }
    return false;
  }
  try {
    await db.collection("estimates").doc(id).update({ paymentStatus });
    return true;
  } catch (err) {
    console.error(`[Firebase] updateEstimateStatus error:`, err);
    return false;
  }
}

export async function updateEstimate(id: string, data: Partial<any>): Promise<boolean> {
  const db = getFirestore();
  if (isMockMode || !db) {
    const dbData = readMockDb();
    dbData.estimates = dbData.estimates || [];
    const index = dbData.estimates.findIndex((e: any) => e.id === id);
    if (index >= 0) {
      dbData.estimates[index] = {
        ...dbData.estimates[index],
        ...data
      };
      writeMockDb(dbData);
      return true;
    }
    return false;
  }
  try {
    await db.collection("estimates").doc(id).update(data);
    return true;
  } catch (err) {
    console.error(`[Firebase] updateEstimate error:`, err);
    return false;
  }
}

export async function addGuestToEstimate(id: string, guestUid: string, guestEmail?: string, guestName?: string): Promise<boolean> {
  const db = getFirestore();
  if (isMockMode || !db) {
    const dbData = readMockDb();
    dbData.estimates = dbData.estimates || [];
    const index = dbData.estimates.findIndex((e: any) => e.id === id);
    if (index >= 0) {
      const guests = dbData.estimates[index].guests || [];
      if (!guests.includes(guestUid)) {
        guests.push(guestUid);
      }
      dbData.estimates[index].guests = guests;
      
      const guestsDetails = dbData.estimates[index].guestsDetails || {};
      guestsDetails[guestUid] = { email: guestEmail || "", name: guestName || "" };
      dbData.estimates[index].guestsDetails = guestsDetails;

      writeMockDb(dbData);
      return true;
    }
    return false;
  }
  try {
    const docRef = db.collection("estimates").doc(id);
    const doc = await docRef.get();
    if (doc.exists) {
      const data = doc.data();
      const guests = data?.guests || [];
      const guestsDetails = data?.guestsDetails || {};
      if (!guests.includes(guestUid)) {
        guests.push(guestUid);
      }
      guestsDetails[guestUid] = { email: guestEmail || "", name: guestName || "" };
      await docRef.update({ guests, guestsDetails });
      return true;
    }
    return false;
  } catch (err) {
    console.error(`[Firebase] addGuestToEstimate error:`, err);
    return false;
  }
}

export async function getLatestEstimateForUser(userId: string): Promise<any | null> {
  const db = getFirestore();
  if (isMockMode || !db) {
    const dbData = readMockDb();
    const estimates = dbData.estimates || [];
    const userEstimates = estimates.filter((e: any) => 
      e.customerId === userId || (e.guests && e.guests.includes(userId))
    );
    if (userEstimates.length === 0) return null;
    userEstimates.sort((a: any, b: any) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
    return userEstimates[0];
  }
  try {
    const snapCustomer = await db.collection("estimates")
      .where("customerId", "==", userId)
      .get();
      
    const snapGuest = await db.collection("estimates")
      .where("guests", "array-contains", userId)
      .get();
      
    const results: any[] = [];
    snapCustomer.forEach((doc: any) => {
      results.push(doc.data());
    });
    snapGuest.forEach((doc: any) => {
      const data = doc.data();
      // Avoid adding duplicates if the user is both the customer and in guests list
      if (!results.some(r => r.id === data.id)) {
        results.push(data);
      }
    });

    if (results.length === 0) return null;

    results.sort((a: any, b: any) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );

    return results[0];
  } catch (err) {
    console.error(`[Firebase] getLatestEstimateForUser error:`, err);
    const dbData = readMockDb();
    const estimates = dbData.estimates || [];
    const userEstimates = estimates.filter((e: any) => 
      e.customerId === userId || (e.guests && e.guests.includes(userId))
    );
    if (userEstimates.length === 0) return null;
    userEstimates.sort((a: any, b: any) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
    return userEstimates[0];
  }
}

export async function addGuestToBooking(id: string, guestUid: string, guestEmail?: string, guestName?: string): Promise<boolean> {
  const db = getFirestore();
  if (isMockMode || !db) {
    const dbData = readMockDb();
    dbData.bookings = dbData.bookings || [];
    const index = dbData.bookings.findIndex((b: any) => b.id === id);
    if (index >= 0) {
      const guests = dbData.bookings[index].guests || [];
      if (!guests.includes(guestUid)) {
        guests.push(guestUid);
      }
      dbData.bookings[index].guests = guests;
      
      const guestsDetails = dbData.bookings[index].guestsDetails || {};
      guestsDetails[guestUid] = { email: guestEmail || "", name: guestName || "" };
      dbData.bookings[index].guestsDetails = guestsDetails;

      writeMockDb(dbData);
      return true;
    }
    return false;
  }
  try {
    const docRef = db.collection("bookings").doc(id);
    const doc = await docRef.get();
    if (doc.exists) {
      const data = doc.data();
      const guests = data?.guests || [];
      const guestsDetails = data?.guestsDetails || {};
      if (!guests.includes(guestUid)) {
        guests.push(guestUid);
      }
      guestsDetails[guestUid] = { email: guestEmail || "", name: guestName || "" };
      await docRef.update({ guests, guestsDetails });
      return true;
    }
    return false;
  } catch (err) {
    console.error(`[Firebase] addGuestToBooking error:`, err);
    return false;
  }
}

export async function getBookingByToken(token: string): Promise<any | null> {
  const db = getFirestore();
  if (isMockMode || !db) {
    const dbData = readMockDb();
    const bookings = dbData.bookings || [];
    return bookings.find((b: any) => b.token === token) || null;
  }
  try {
    const snap = await db.collection("bookings").where("token", "==", token).limit(1).get();
    if (!snap.empty) return snap.docs[0].data();
  } catch (err) {
    console.error(`[Firebase] getBookingByToken error:`, err);
  }
  return null;
}

export async function getBooking(id: string): Promise<any | null> {
  const db = getFirestore();
  if (isMockMode || !db) {
    const dbData = readMockDb();
    const bookings = dbData.bookings || [];
    return bookings.find((b: any) => b.id === id) || null;
  }
  try {
    const doc = await db.collection("bookings").doc(id).get();
    if (doc.exists) return doc.data();
  } catch (err) {
    console.error(`[Firebase] getBooking error for id ${id}:`, err);
  }
  return null;
}

export async function promoteUserToAdmin(uid: string, plan?: string): Promise<boolean> {
  const db = getFirestore();
  if (isMockMode || !db) {
    const dbData = readMockDb();
    dbData.userProfiles = dbData.userProfiles || {};
    dbData.userProfiles[uid] = dbData.userProfiles[uid] || {};
    dbData.userProfiles[uid].isAdmin = true;
    if (plan) {
      dbData.userProfiles[uid].plan = plan;
    }
    writeMockDb(dbData);
    return true;
  }

  try {
    const updateData: any = { isAdmin: true };
    if (plan) {
      updateData.plan = plan;
    }
    await db.collection("users").doc(uid).set(updateData, { merge: true });
    return true;
  } catch (err) {
    console.error("[Firebase] promoteUserToAdmin error:", err);
    return false;
  }
}

export async function getUserProfile(uid: string): Promise<any> {
  const db = getFirestore();
  if (isMockMode || !db) {
    const dbData = readMockDb();
    const userProfiles = dbData.userProfiles || {};
    return userProfiles[uid] || null;
  }

  try {
    const doc = await db.collection("users").doc(uid).get();
    if (doc.exists) {
      return doc.data();
    }
  } catch (err) {
    console.error("[Firebase] getUserProfile error:", err);
  }
  return null;
}

export async function updateUserProfile(uid: string, data: any): Promise<boolean> {
  const db = getFirestore();
  if (isMockMode || !db) {
    const dbData = readMockDb();
    if (!dbData.userProfiles) {
      dbData.userProfiles = {};
    }
    if (!dbData.userProfiles[uid]) {
      dbData.userProfiles[uid] = {};
    }
    dbData.userProfiles[uid] = {
      ...dbData.userProfiles[uid],
      ...data
    };
    writeMockDb(dbData);
    return true;
  }

  try {
    await db.collection("users").doc(uid).set(data, { merge: true });
    return true;
  } catch (err) {
    console.error("[Firebase] updateUserProfile error:", err);
    return false;
  }
}

export async function getHostIdBySubdomain(subdomain: string): Promise<string | null> {
  const db = getFirestore();
  if (isMockMode || !db) {
    const dbData = readMockDb();
    const userProfiles = dbData.userProfiles || {};
    for (const [uid, profile] of Object.entries(userProfiles)) {
      if ((profile as any).subdomain === subdomain) {
        return uid;
      }
    }
    // Fallback/test mapping for localhost testing convenience
    if (subdomain === "tenant1") {
      return "mock_admin_test_example_com";
    }
    return null;
  }

  try {
    const snapshot = await db.collection("users").where("subdomain", "==", subdomain).limit(1).get();
    if (!snapshot.empty) {
      return snapshot.docs[0].id;
    }
  } catch (err) {
    console.error("[Firebase] getHostIdBySubdomain error:", err);
  }
  return null;
}


