const fs = require("fs");
const path = require("path");

function removeIfExists(targetPath) {
  try {
    if (fs.existsSync(targetPath)) {
      fs.rmSync(targetPath, { recursive: true, force: true });
    }
  } catch {
    // Ignore cleanup errors in local development.
  }
}

function removeGeneratedPwaFiles(publicDir) {
  try {
    if (!fs.existsSync(publicDir)) return;
    const files = fs.readdirSync(publicDir);
    for (const file of files) {
      if (file === "sw.js" || (file.startsWith("workbox-") && file.endsWith(".js"))) {
        removeIfExists(path.join(publicDir, file));
      }
    }
  } catch {
    // Ignore cleanup errors in local development.
  }
}

const root = process.cwd();
// Always clean .next in development to avoid stale manifest/CSS references
// (e.g. /_next/static/css/app/layout.css 404 after restarts).
removeIfExists(path.join(root, ".next"));
removeGeneratedPwaFiles(path.join(root, "public"));
