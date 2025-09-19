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
      "*.config.*",
      "public/**",
    ],
  },
  {
    rules: {
      // TypeScript rules - permissivo para desenvolvimento
      "@typescript-eslint/no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        ignoreRestSiblings: true
      }],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/ban-ts-comment": "warn",
      "@typescript-eslint/prefer-as-const": "warn",

      // React rules - warnings apenas
      "react-hooks/exhaustive-deps": "warn",
      "react/jsx-key": "warn", // Mudado de error para warn
      "react/no-unescaped-entities": "warn",
      "jsx-a11y/alt-text": "warn",
      "jsx-a11y/anchor-is-valid": "warn",

      // Next.js rules - warnings apenas
      "@next/next/no-img-element": "warn",
      "@next/next/no-html-link-for-pages": "warn",

      // General rules - muito permissivo
      "no-console": "off", // Desabilitado completamente
      "prefer-const": "warn",
      "no-var": "warn",
      "no-unused-expressions": "warn",

      // Desabilitar regras problemáticas
      "import/no-anonymous-default-export": "off",
      "react/display-name": "off",
    },
  },
];

export default eslintConfig;
