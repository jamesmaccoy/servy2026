const fs = require("fs");
const path = require("path");

const serviceAccountPath = "/Users/jamesmac/Downloads/simpleplek-9d373-firebase-adminsdk-fbsvc-29751ad467.json";
const envPath = path.join(__dirname, "../.env.local");

if (!fs.existsSync(serviceAccountPath)) {
  console.error("❌ Service account file not found at:", serviceAccountPath);
  process.exit(1);
}

try {
  const serviceAccountContent = fs.readFileSync(serviceAccountPath, "utf8");
  // Parse to ensure valid JSON, and strip formatting
  const serviceAccountObj = JSON.parse(serviceAccountContent);
  const minifiedJson = JSON.stringify(serviceAccountObj);

  let envContent = "";
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, "utf8");
  }

  const envVarName = "FIREBASE_SERVICE_ACCOUNT_JSON";
  const envLine = `${envVarName}='${minifiedJson}'`;

  if (envContent.includes(envVarName)) {
    // Replace existing entry
    const regex = new RegExp(`${envVarName}=['\"].*?['\"]`, "g");
    envContent = envContent.replace(regex, envLine);
  } else {
    envContent += (envContent.endsWith("\n") ? "" : "\n") + envLine + "\n";
  }

  // Also write the project ID as environment variables for ease of use
  const nextPublicIdVar = "NEXT_PUBLIC_FIREBASE_PROJECT_ID";
  const nextPublicIdLine = `${nextPublicIdVar}='${serviceAccountObj.project_id}'`;
  if (envContent.includes(nextPublicIdVar)) {
    const regex = new RegExp(`${nextPublicIdVar}=['\"].*?['\"]`, "g");
    envContent = envContent.replace(regex, nextPublicIdLine);
  } else {
    envContent += nextPublicIdLine + "\n";
  }

  fs.writeFileSync(envPath, envContent, "utf8");
  console.log("✅ Successfully updated .env.local with service account environment variables!");
} catch (err) {
  console.error("❌ Error setting up environment file:", err.message);
  process.exit(1);
}
