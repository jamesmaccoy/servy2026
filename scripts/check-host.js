const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");
const fs = require("fs");

const serviceAccount = JSON.parse(fs.readFileSync("/Users/jamesmac/Downloads/simpleplek-9d373-firebase-adminsdk-fbsvc-29751ad467.json", "utf8"));

admin.initializeApp({
  credential: admin.cert(serviceAccount),
  projectId: serviceAccount.project_id
});

const db = getFirestore();
const auth = getAuth();

async function check() {
  console.log("Listing properties from Firestore...");
  const snap = await db.collection("properties").get();
  for (const doc of snap.docs) {
    const data = doc.data();
    console.log(`\nProperty: "${data.title}" (ID: ${doc.id})`);
    console.log(`- hostId: "${data.hostId}"`);
    if (data.hostId) {
      // Look up user doc
      const userDoc = await db.collection("users").doc(data.hostId).get();
      if (userDoc.exists) {
        console.log(`  - User doc email: "${userDoc.data().email}"`);
      } else {
        console.log(`  - User doc: NOT FOUND`);
      }
      // Look up auth email
      try {
        const userRecord = await auth.getUser(data.hostId);
        console.log(`  - Auth email: "${userRecord.email}"`);
      } catch (err) {
        console.log(`  - Auth lookup error: ${err.message}`);
      }
    }
  }
}

check().catch(console.error);
