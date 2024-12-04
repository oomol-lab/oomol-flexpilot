set -e

npm run package -- --target darwin-arm64
npx vsce package --target darwin-arm64 --out "oopilot-darwin-arm64.vsix"
