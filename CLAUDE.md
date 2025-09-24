# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ContabilidadePRO is a Brazilian accounting automation system built with AI integration. The system is designed as a simplified but comprehensive platform for solo accountants to manage clients, perform fiscal calculations, process documents with OCR, and interact with an AI assistant for accounting queries.

## Architecture

The project is structured as a monorepo with the main Next.js application in `contador-solo-ai/` and Supabase backend services:

- **Frontend**: Next.js 15 with React 19, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **AI Services**: OpenAI GPT-4o integration
- **Database**: PostgreSQL with Row Level Security

## Development Commands

### Main Development
```bash
# Development with Turbopack (recommended)
cd contador-solo-ai && npm run dev

# Development with webpack
cd contador-solo-ai && npm run dev:webpack

# Build for production
cd contador-solo-ai && npm run build

# Type checking
cd contador-solo-ai && npm run type-check

# Linting
cd contador-solo-ai && npm run lint
cd contador-solo-ai && npm run lint:fix
```

### Code Quality
```bash
# Production-level linting (stricter)
cd contador-solo-ai && npm run lint:prod

# Development linting (permissive)
cd contador-solo-ai && npm run lint:dev

# Format code
cd contador-solo-ai && npm run format
cd contador-solo-ai && npm run format:check

# Clean up imports
cd contador-solo-ai && npm run clean:imports

# Check for unused imports
cd contador-solo-ai && npm run lint:unused
```

### Bundle Analysis
```bash
# Analyze bundle size (Windows compatible - uses 'set')
cd contador-solo-ai && npm run analyze

# Analyze server bundle
cd contador-solo-ai && npm run analyze:server

# Analyze browser bundle
cd contador-solo-ai && npm run analyze:browser

# Build with strict linting and type checking
cd contador-solo-ai && npm run build:strict
```

### Workers and Background Tasks
```bash
# Start background workers
cd contador-solo-ai && npm run workers:start

# Start workers in development mode
cd contador-solo-ai && npm run workers:dev
```

### Supabase Development
```bash
# Generate TypeScript types from database
cd contador-solo-ai && npm run supabase:types

# Start local Supabase (from root)
supabase start

# Deploy functions
supabase functions deploy

# Deploy specific function
supabase functions deploy [function-name]

# View function logs
supabase logs
```

### Testing
```bash
# Frontend tests
cd contador-solo-ai && npm test
cd contador-solo-ai && npm run test:watch
cd contador-solo-ai && npm run test:coverage
cd contador-solo-ai && npm run test:unit
cd contador-solo-ai && npm run test:integration
cd contador-solo-ai && npm run test:ci

# Edge Functions tests (from root)
cd supabase/functions && npm test
cd supabase/functions && npm run test:watch
cd supabase/functions && npm run test:coverage
cd supabase/functions && npm run test:unit
cd supabase/functions && npm run test:integration
cd supabase/functions && npm run test:ci

# End-to-end tests
cd contador-solo-ai && npm run test:e2e
cd contador-solo-ai && npm run test:e2e:watch
cd contador-solo-ai && npm run test:e2e:coverage
cd contador-solo-ai && npm run test:e2e:full
cd contador-solo-ai && npm run test:e2e:report
```

## Key Environment Variables

Required for development:
```bash
# Supabase Authentication & API
NEXT_PUBLIC_SUPABASE_URL=           # Your project URL (public)
NEXT_PUBLIC_SUPABASE_ANON_KEY=      # Anonymous/client key (public, RLS enforced)
SUPABASE_SERVICE_ROLE_KEY=          # Service key (PRIVATE, bypasses RLS)

# OpenAI (required for AI features)
OPENAI_API_KEY=                     # OpenAI API key (PRIVATE)

# Optional OCR services
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=
AZURE_DOCUMENT_INTELLIGENCE_KEY=
GOOGLE_VISION_API_KEY=

# Application
NEXT_PUBLIC_APP_URL=                # Your app URL (public)
NODE_ENV=                          # development/production
```

### Supabase Key Usage
- **ANON_KEY**: Used in frontend/client code, switches to user JWT after login
- **SERVICE_KEY**: Used only in Edge Functions/server code, has full database access
- **Never expose SERVICE_KEY** in client-side code or commit to version control

### Authentication Flow
ContabilidadePRO uses Supabase Auth with the following patterns:
- Email/password authentication for accountants
- Magic link support for passwordless login
- MFA enrollment for enhanced security
- User context automatically applied to all database operations via RLS
- Admin functions (user invites) require SERVICE_KEY in Edge Functions

## Code Organization

### Frontend Structure (`contador-solo-ai/src/`)
- `app/` - Next.js App Router pages and layouts
- `components/` - React components (UI, business logic)
- `lib/` - Utilities, configurations, and core services
- `services/` - Business logic and external API integrations
- `types/` - TypeScript type definitions
- `hooks/` - Custom React hooks

### Key Application Routes
- `/` - Landing page
- `/login` - Authentication page
- `/unauthorized` - Access denied page
- `/dashboard` - Main dashboard
- `/dashboard-optimized` - Optimized dashboard version
- `/dashboard-comparativo` - Comparative dashboard
- `/assistente` - AI chat assistant
- `/calculos` - Tax calculations
- `/novo-calculo` - New calculation wizard
- `/documentos` - Document management with OCR
- `/documentos-ocr` - OCR processing interface
- `/clientes` - Client management
- `/empresas` - Company management (multi-company support)
- `/empresa` - Individual company management
- `/prazos` - Tax deadlines and calendar
- `/calendario` - Calendar view
- `/relatorios` - Reports and analytics
- `/relatorios-ia` - AI-powered reports
- `/comparacao` - Comparison tools
- `/seguranca` - Security settings
- `/export` - Data export functionality
- `/satisfacao` - User satisfaction/feedback
- `/test-ocr` - OCR testing interface
- `/test-notifications` - Notification testing
- `/cache-migration` - Cache migration tools
- `/cache-monitor` - Cache monitoring
- `/edge-runtime-demo` - Edge runtime demonstrations
- `/extensoes-demo` - Extensions demonstrations

### Supabase Functions (`supabase/functions/`)
- `assistente-contabil-ia/` - AI assistant service
- `pdf-ocr-service/` - Document OCR processing
- `fiscal-service/` - Tax calculation services
- `realtime-analytics-engine/` - Real-time analytics
- `documentos-service/` - Unified document processing service
- `data-export-service/` - Data export functionality
- `relatorio-generator-service/` - Report generation
- `empresa-context-service/` - Company context and data
- `monitoring-dashboard/` - System monitoring and metrics
- `alerts-service/` - Alert escalation and notification service
- `security-service/` - Security monitoring and compliance
- `voice-assistant-service/` - Voice assistant functionality
- `_shared/` - Shared utilities and middleware

## Development Guidelines

### Code Style
- ESLint is configured with permissive rules for development
- Production builds use stricter linting (`lint:prod`)
- TypeScript strict mode enabled
- Tailwind CSS for styling with custom design system
- Two ESLint configs: `.eslintrc.development.js` (permissive) and `.eslintrc.production.js` (strict)

### Performance Optimizations
- Turbopack enabled for faster builds
- Bundle splitting configured for major dependencies
- Image optimization with Next.js Image component
- Lazy loading for heavy components

### AI Integration
- OpenAI GPT-4o for context-aware insights
- OCR services for document processing (supports multiple providers)
- Structured prompts for Brazilian tax law compliance

### Security Considerations
- Row Level Security (RLS) enabled on Supabase tables
- JWT-based authentication with refresh token rotation
- Security headers configured in Next.js
- MFA support for enhanced security

## Testing Strategy

### Frontend Testing
- Jest with React Testing Library for unit tests
- E2E testing framework configured
- TypeScript for compile-time type checking
- Coverage reporting with thresholds

### Edge Functions Testing
- Jest with TypeScript support for Edge Functions
- Unit and integration test patterns
- Coverage threshold: 80% functions/lines, 70% branches
- Test isolation with mocks for external services
- Structured test reporting in `test-reports/`

## Common Tasks

### Adding New Pages
1. Create page component in `contador-solo-ai/src/app/[route]/page.tsx`
2. Update navigation in `src/components/layout/sidebar.tsx` if needed
3. Add route to metadata in `src/lib/metadata.ts`

### Adding New Supabase Functions
1. Create function directory in `supabase/functions/`
2. Implement `index.ts` with proper error handling
3. Use shared utilities from `supabase/functions/_shared/`
4. Add tests in `__tests__/` directory following Jest patterns
5. Run tests: `cd supabase/functions && npm test`
6. Deploy with `supabase functions deploy [function-name]`

### Running Tests
- **Frontend**: Always run from `contador-solo-ai/` directory
- **Edge Functions**: Always run from `supabase/functions/` directory
- Use coverage reports to maintain quality standards
- Check test reports in respective `test-reports/` directories

### Working with Database
- Database types are auto-generated with `npm run supabase:types`
- Use Supabase client from `src/lib/supabase.ts`
- Follow RLS patterns for data security
- User ID automatically available in RLS policies via `auth.uid()`
- Reference users in tables using `user_id` fields pointing to `auth.users`

### User Management Patterns
- **Frontend Auth**: Use `supabase.auth.signInWithPassword()`, `signUp()`, `signOut()`
- **User Data**: Access current user with `supabase.auth.getUser()`
- **Password Reset**: Use `supabase.auth.resetPasswordForEmail()`
- **Admin Operations**: Use Edge Functions with SERVICE_KEY for user invites
- **Profile Management**: Create `profiles` table linked to `auth.users.id`

### Debugging
- **Frontend**: Use structured logging from `src/lib/simple-logger.ts`
- **Frontend**: Chrome DevTools for client-side debugging
- **Edge Functions**: Use structured logger from `_shared/structured-logger.ts`
- **Edge Functions**: Supabase logs with `supabase logs`
- **Edge Functions**: Edge function inspector on port 8083
- **Testing**: Jest verbose mode enabled for detailed test output

### Platform-Specific Notes
- **Windows**: Bundle analysis scripts use `set` command instead of `export`
- **Cross-platform**: Turbopack is the recommended build tool for faster development
- **Environment**: All environment files follow `.env.local` pattern with validation

## Important Files to Know

### Configuration Files
- `contador-solo-ai/next.config.ts` - Next.js configuration with performance optimizations and bundle analyzer
- `contador-solo-ai/eslint.config.mjs` - Main ESLint configuration
- `contador-solo-ai/.eslintrc.development.js` - Development ESLint config (permissive)
- `contador-solo-ai/.eslintrc.production.js` - Production ESLint config (strict)
- `contador-solo-ai/src/lib/supabase.ts` - Supabase client configuration with error handling
- `contador-solo-ai/src/lib/openai.ts` - OpenAI client setup
- `contador-solo-ai/.env.example` - Environment variables template
- `supabase/config.toml` - Supabase local development configuration
- `contador-solo-ai/src/types/database.types.ts` - Auto-generated database types

### Testing Configuration
- `contador-solo-ai/jest.config.js` - Frontend Jest configuration
- `supabase/functions/jest.config.js` - Edge Functions Jest configuration
- `supabase/functions/jest.setup.js` - Test setup for Edge Functions
- `supabase/functions/package.json` - Edge Functions dependencies and test scripts

### Shared Utilities
- `supabase/functions/_shared/structured-logger.ts` - Centralized logging
- `supabase/functions/_shared/circuit-breaker.ts` - Circuit breaker pattern
- `supabase/functions/_shared/memory-managed-cache.ts` - Memory management
- `supabase/functions/_shared/error-handler.ts` - Error handling middleware

## Brazilian Tax Domain Knowledge

The system includes specialized knowledge for:
- DAS (Documento de Arrecadação do Simples Nacional) calculations
- NFe (Nota Fiscal Eletrônica) processing
- Brazilian tax compliance monitoring
- Document classification for Brazilian fiscal documents

This system is specifically designed for the Brazilian market and includes locale-specific calculations, document formats, and compliance requirements.