module.exports = {
  extends: ['./eslint.config.mjs'],
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  rules: {
    // Produção - mais rigoroso
    '@typescript-eslint/no-unused-vars': ['error', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      ignoreRestSiblings: true 
    }],
    '@typescript-eslint/no-explicit-any': 'error',
    'no-console': 'error',
    'react-hooks/exhaustive-deps': 'error',
    'jsx-a11y/alt-text': 'error',
    '@next/next/no-img-element': 'error',
    
    // Erros críticos
    'react/jsx-key': 'error',
    'no-var': 'error',
    'no-undef': 'error',
    'prefer-const': 'error',
  },
};
