import pluginJs from "@eslint/js";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  { ignores: ["node_modules/*", "types/*", "out/*", "launch_folder/*"] },
  { files: ["**/*.{ts,mts,cts,tsx,js,mjs,cjs,jsx}"] },
  { languageOptions: { globals: globals.node } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  eslintPluginPrettierRecommended,
  {
    ignores: ["node_modules/**", "build/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "fs",
              message: "Please use vscode.workspace.fs",
            },
            {
              name: "fs/promises",
              message: "Please use vscode.workspace.fs",
            },
          ],
        },
      ],
    },
  },
];
