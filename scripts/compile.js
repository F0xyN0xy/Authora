// Compiles the contracts using the pure-JS `solc` package directly, bypassing
// Hardhat's own compiler downloader. Writes ABI + bytecode JSON artifacts to
// ./build so scripts/deploy.js and the tests can use them without `hardhat compile`.
import fs from "fs";
import path from "path";
import solc from "solc";

const CONTRACTS_DIR = path.join(import.meta.dirname, "..", "contracts");
const BUILD_DIR = path.join(import.meta.dirname, "..", "build");

function findImports(importPath) {
  const resolved = path.join(CONTRACTS_DIR, importPath);
  if (fs.existsSync(resolved)) {
    return { contents: fs.readFileSync(resolved, "utf8") };
  }
  return { error: `File not found: ${importPath}` };
}

const readCallback = {
  import: findImports
};

function main() {
  const files = fs.readdirSync(CONTRACTS_DIR).filter((f) => f.endsWith(".sol"));
  const sources = {};
  for (const file of files) {
    sources[file] = { content: fs.readFileSync(path.join(CONTRACTS_DIR, file), "utf8") };
  }

  const input = {
    language: "Solidity",
    sources,
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: {
        "*": { "*": ["abi", "evm.bytecode.object"] },
      },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input), readCallback));

  let hasError = false;
  if (output.errors) {
    for (const err of output.errors) {
      console[err.severity === "error" ? "error" : "warn"](err.formattedMessage);
      if (err.severity === "error") hasError = true;
    }
  }
  if (hasError) process.exit(1);

  fs.mkdirSync(BUILD_DIR, { recursive: true });
  for (const file of Object.keys(output.contracts)) {
    for (const contractName of Object.keys(output.contracts[file])) {
      const artifact = output.contracts[file][contractName];
      const out = {
        contractName,
        abi: artifact.abi,
        bytecode: "0x" + artifact.evm.bytecode.object,
      };
      fs.writeFileSync(
        path.join(BUILD_DIR, `${contractName}.json`),
        JSON.stringify(out, null, 2)
      );
      console.log(`Compiled ${contractName} -> build/${contractName}.json`);
    }
  }
}

main();
