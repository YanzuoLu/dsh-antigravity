import { build } from "esbuild";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
await build({
  absWorkingDir: root,
  entryPoints: ["src/upstream/core-entry.ts"],
  outfile: "lib/core.js",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  packages: "external",
  legalComments: "inline",
  banner: { js: "// Derived from pi-antigravity 3870729ede108e439ad2a48ca0448b2245e863b2. MIT license in UPSTREAM.md." },
});
