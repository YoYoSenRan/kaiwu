import js from "@eslint/js"
import tseslint from "typescript-eslint"
import reactHooks from "eslint-plugin-react-hooks"
import reactRefresh from "eslint-plugin-react-refresh"
import eslintConfigPrettier from "eslint-config-prettier"
import { defineConfig } from "eslint/config"

export default defineConfig(
  js.configs.recommended,
  tseslint.configs.recommended,

  {
    rules: { "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }] },
  },

  // React 规则（仅 app/ 目录）
  {
    files: ["app/**/*.{ts,tsx}"],
    ignores: ["app/components/ui/**"],
    plugins: { "react-hooks": reactHooks, "react-refresh": reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    },
  },

  eslintConfigPrettier,

  { ignores: ["dist", "dist-electron", "release", "node_modules", ".vscode", "*.cjs", "scripts"] },
)
