import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // Escopado só a este arquivo (achado do review adversarial: desligar a
    // regra pra `e2e/**/*.ts` inteiro esconderia um hook-shaped footgun real
    // em qualquer spec futuro) -- a fixture `use` do Playwright
    // (e2e/fixtures/auth.ts) tem o mesmo nome de parâmetro convencionado
    // pela lib, mas dispara falso-positivo de react-hooks/rules-of-hooks
    // (regra assume que qualquer função chamada `use*` é um React Hook).
    files: ["e2e/fixtures/auth.ts"],
    rules: {
      "react-hooks/rules-of-hooks": "off",
    },
  },
]);

export default eslintConfig;
