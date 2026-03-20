import * as esbuild from "esbuild";

const isWatch = process.argv.includes("--watch");

/** @type {esbuild.BuildOptions} */
const buildOptions = {
  entryPoints: ["src/extension.ts"],
  bundle: true,
  outfile: "dist/extension.js",
  external: ["vscode"],
  format: "cjs",
  platform: "node",
  target: "node18",
  sourcemap: true,
  minify: !isWatch,
  treeShaking: true,
  // Keep class names for Agent identification
  keepNames: true,
  define: {
    "process.env.NODE_ENV": isWatch ? '"development"' : '"production"',
  },
  logLevel: "info",
};

async function main() {
  if (isWatch) {
    const ctx = await esbuild.context(buildOptions);
    await ctx.watch();
    console.log("[king-agents] watching for changes...");
  } else {
    await esbuild.build(buildOptions);
    console.log("[king-agents] build complete.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
