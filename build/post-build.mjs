import { Command, Option } from "commander";
import * as fs from "fs";
import * as path from "path";
import extensionConfig from "../webpack.config.mjs";

const targetMapping = {
  "win32-x64": "node-napi.win32-x64-msvc.node",
  "win32-arm64": "node-napi.win32-arm64-msvc.node",
  "linux-x64": "node-napi.linux-x64-gnu.node",
  "linux-arm64": "node-napi.linux-arm64-gnu.node",
  "linux-armhf": "node-napi.linux-arm-gnueabihf.node",
  "alpine-x64": "node-napi.linux-x64-musl.node",
  "darwin-x64": "node-napi.darwin-x64.node",
  "darwin-arm64": "node-napi.darwin-arm64.node",
  "alpine-arm64": "node-napi.linux-arm64-musl.node",
};

const args = new Command()
  .addOption(
    new Option("--target [platform]", "Specify the target VS Code platform")
      .choices(Object.keys(targetMapping))
      .makeOptionMandatory(),
  )
  .parse()
  .opts();

const outDir = extensionConfig[0].output.path;
for (const file of fs.readdirSync(outDir)) {
  if (file === targetMapping[args.target]) {
    continue;
  } else if (file.startsWith("node-napi")) {
    console.log(`Deleting file: ${file}`);
    fs.unlinkSync(path.join(outDir, file));
  }
}
