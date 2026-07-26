import tseslint from 'typescript-eslint';

export default [
  // Standard TS linting
  ...tseslint.configs.recommended,
  
  // Optional: Add custom rules or project-specific overrides here
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }]
    }
  }
];
