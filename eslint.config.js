import js from "@eslint/js"
import tseslint from "typescript-eslint"
import reactHooks from "eslint-plugin-react-hooks"
import reactRefresh from "eslint-plugin-react-refresh"
import eslintConfigPrettier from "eslint-config-prettier"

export default tseslint.config(
  { ignores: ["dist", "dist-electron", "release", "node_modules", ".vscode", "*.cjs"] },

  // 全局：JS/TS 推荐规则
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // 全局规则覆盖
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },

  // app/ 目录：追加 React 相关规则
  {
    files: ["app/**/*.{ts,tsx}"],
    ignores: ["app/components/ui/**"],
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    },
  },

  // 关掉与 Prettier 冲突的规则（必须放最后）
  eslintConfigPrettier,
)
