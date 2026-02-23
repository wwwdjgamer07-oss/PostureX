const { spawn } = require("child_process");

require("./clean-dev-artifacts");

function stripNodeSourceMaps(options) {
  if (!options) return "";
  return options
    .split(/\s+/)
    .filter(
      (item) =>
        item &&
        item !== "--enable-source-maps" &&
        item !== "--inspect" &&
        item !== "--inspect-brk" &&
        !item.startsWith("--inspect=")
    )
    .join(" ")
    .trim();
}

const env = { ...process.env };
const nextOptions = stripNodeSourceMaps(env.NODE_OPTIONS);

if (nextOptions) {
  env.NODE_OPTIONS = nextOptions;
} else {
  delete env.NODE_OPTIONS;
}

const nextBin = require.resolve("next/dist/bin/next");
const child = spawn(process.execPath, [nextBin, "dev"], {
  stdio: "inherit",
  env
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
