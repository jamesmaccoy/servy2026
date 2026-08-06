const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");
const fs = require("fs");
const path = require("path");

const serviceAccountPath = "/Users/jamesmac/Downloads/simpleplek-9d373-firebase-adminsdk-fbsvc-29751ad467.json";
const mockDbPath = path.join(__dirname, "../db-mock.json");

if (!fs.existsSync(serviceAccountPath)) {
  console.error("❌ Service account file not found at:", serviceAccountPath);
  process.exit(1);
}

if (!fs.existsSync(mockDbPath)) {
  console.error("❌ Mock DB file not found at:", mockDbPath);
  process.exit(1);
}

try {
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
  const mockData = JSON.parse(fs.readFileSync(mockDbPath, "utf8"));

  admin.initializeApp({
    credential: admin.cert(serviceAccount),
    projectId: serviceAccount.project_id
  });

  const db = getFirestore();

  async function migrate() {
    console.log(`🚀 Starting migration to Firestore project: ${serviceAccount.project_id}`);

    // 1. Properties
    if (mockData.properties && Array.isArray(mockData.properties)) {
      console.log(`\n📂 Migrating properties (${mockData.properties.length})...`);
      const batch = db.batch();
      for (const prop of mockData.properties) {
        if (!prop.id) continue;
        const ref = db.collection("properties").doc(prop.id);
        batch.set(ref, prop);
        console.log(`  -> Property queued: ${prop.id}`);
      }
      await batch.commit();
      console.log("✅ Properties migrated successfully.");
    }

    // 2. Packages
    if (mockData.packages && Array.isArray(mockData.packages)) {
      console.log(`\n📂 Migrating packages (${mockData.packages.length})...`);
      const batch = db.batch();
      for (const pkg of mockData.packages) {
        if (!pkg.id) continue;
        const ref = db.collection("packages").doc(pkg.id);
        batch.set(ref, pkg);
        console.log(`  -> Package queued: ${pkg.id}`);
      }
      await batch.commit();
      console.log("✅ Packages migrated successfully.");
    }

    // 3. Bookings
    if (mockData.bookings && Array.isArray(mockData.bookings)) {
      console.log(`\n📂 Migrating bookings (${mockData.bookings.length})...`);
      const batch = db.batch();
      for (const booking of mockData.bookings) {
        if (!booking.id) continue;
        const ref = db.collection("bookings").doc(booking.id);
        batch.set(ref, booking);
        console.log(`  -> Booking queued: ${booking.id}`);
      }
      await batch.commit();
      console.log("✅ Bookings migrated successfully.");
    }

    // 4. User Dates
    if (mockData.userDates && typeof mockData.userDates === "object") {
      const uids = Object.keys(mockData.userDates);
      console.log(`\n📂 Migrating user dates (${uids.length})...`);
      const batch = db.batch();
      for (const uid of uids) {
        const dateRecord = mockData.userDates[uid];
        const ref = db.collection("users").doc(uid);
        batch.set(ref, dateRecord, { merge: true });
        console.log(`  -> User dates queued: ${uid}`);
      }
      await batch.commit();
      console.log("✅ User dates migrated successfully.");
    }

    console.log("\n🎉 Database migration finished successfully!");
  }

  migrate().catch(err => {
    console.error("❌ Migration logic failed:", err);
    process.exit(1);
  });
} catch (err) {
  console.error("❌ Initialization/Parsing failed:", err.message);
  process.exit(1);
}
