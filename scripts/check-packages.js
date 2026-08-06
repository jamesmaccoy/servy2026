const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");
const fs = require("fs");

const serviceAccount = JSON.parse(fs.readFileSync("/Users/jamesmac/Downloads/simpleplek-9d373-firebase-adminsdk-fbsvc-29751ad467.json", "utf8"));

admin.initializeApp({
  credential: admin.cert(serviceAccount),
  projectId: serviceAccount.project_id
});

const db = getFirestore();

async function check() {
  const snap = await db.collection("packages").get();
  console.log(`Found ${snap.size} packages in Firestore simpleplek-9d373:`);
  snap.forEach(doc => {
    console.log(`- [${doc.id}]:`, doc.data().name, `(Price: R ${doc.data().price})`);
  });
}

check().catch(console.error);
