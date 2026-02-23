const [major] = process.versions.node.split(".").map((v) => Number(v));

if (!Number.isFinite(major) || major < 18 || major >= 23) {
  console.error("");
  console.error("Unsupported Node.js version for this project.");
  console.error(`Detected: v${process.versions.node}`);
  console.error("Required: >=18 and <23 (recommended: Node 20 LTS)");
  console.error("");
  console.error("Use nvm-windows:");
  console.error("  nvm install 20.18.3");
  console.error("  nvm use 20.18.3");
  console.error("");
  process.exit(1);
}
