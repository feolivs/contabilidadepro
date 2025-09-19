module.exports = {
  extends: ['./eslint.config.mjs'],
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  rules: {
    // Desenvolvimento - muito permissivo
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    'no-console': 'off',
    'react-hooks/exhaustive-deps': 'off',
    'jsx-a11y/alt-text': 'off',
    '@next/next/no-img-element': 'off',
    
    // Manter apenas erros críticos
    'react/jsx-key': 'error',
    'no-var': 'error',
    'no-undef': 'error',
  },
};
