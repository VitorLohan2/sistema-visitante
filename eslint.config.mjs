import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ["**/*.{js,jsx,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      react,
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      "react/react-in-jsx-scope": "off", // React 17+ não precisa importar React
      "react/prop-types": "off", // Desativa PropTypes se você usa TypeScript ou preferir sem
      "no-unused-vars": ["warn"],
      "no-console": ["warn"],
      "react/jsx-uses-react": "off",
      "react/jsx-uses-vars": "warn",
    },
  },
  js.configs.recommended,
  react.configs.flat.recommended,
]);
