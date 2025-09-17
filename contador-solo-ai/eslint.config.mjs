import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  {
    rules: {
      // TypeScript rules - mais permissivo durante desenvolvimento
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/ban-ts-comment": "warn",

      // React rules
      "react-hooks/exhaustive-deps": "warn",
      "react/jsx-key": "error",
      "jsx-a11y/alt-text": "warn",

      // General rules - mais permissivo
      "no-console": "warn",
      "prefer-const": "warn",
      "no-var": "error",
    },
  },
];

export default eslintConfig;
