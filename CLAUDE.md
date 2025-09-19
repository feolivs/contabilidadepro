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

# Clean up imports
cd contador-solo-ai && npm run clean:imports

# Check for unused imports
cd contador-solo-ai && npm run lint:unused
```

### Bundle Analysis
```bash
# Analyze bundle size
cd contador-solo-ai && npm run analyze

# Analyze server bundle
cd contador-solo-ai && npm run analyze:server

# Analyze browser bundle
cd contador-solo-ai && npm run analyze:browser
```

### Supabase Development
```bash
# Generate TypeScript types from database
cd contador-solo-ai && npm run supabase:types

# Start local Supabase (from root)
supabase start

# Deploy functions
supabase functions deploy
```

## Key Environment Variables

Required for development:
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# OpenAI (required for AI features)
OPENAI_API_KEY=

# Optional OCR services
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=
AZURE_DOCUMENT_INTELLIGENCE_KEY=
GOOGLE_VISION_API_KEY=

# Application
NEXT_PUBLIC_APP_URL=
NODE_ENV=
```

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
- `/dashboard` - Main dashboard (optimized version at `/dashboard-optimized`)
- `/assistente` - AI chat assistant
- `/calculos` - Tax calculations
- `/documentos` - Document management with OCR
- `/clientes` - Client management
- `/prazos` - Tax deadlines and calendar
- `/relatorios` - Reports and analytics

### Supabase Functions (`supabase/functions/`)
- `assistente-contabil-ia/` - AI assistant service
- `pdf-ocr-service/` - Document OCR processing
- `fiscal-service/` - Tax calculation services
- `auth-security-monitor/` - Authentication monitoring
- `mfa-enrollment-handler/` - Multi-factor authentication
- `realtime-analytics-engine/` - Real-time analytics

## Development Guidelines

### Code Style
- ESLint is configured with permissive rules for development
- Production builds use stricter linting (`lint:prod`)
- TypeScript strict mode enabled
- Tailwind CSS for styling with custom design system

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

Currently using:
- TypeScript for compile-time type checking
- ESLint for code quality
- Manual testing in development

## Common Tasks

### Adding New Pages
1. Create page component in `contador-solo-ai/src/app/[route]/page.tsx`
2. Update navigation in `src/components/layout/sidebar.tsx` if needed
3. Add route to metadata in `src/lib/metadata.ts`

### Adding New Supabase Functions
1. Create function directory in `supabase/functions/`
2. Implement `index.ts` with proper error handling
3. Use shared utilities from `supabase/functions/_shared/`
4. Deploy with `supabase functions deploy [function-name]`

### Working with Database
- Database types are auto-generated with `npm run supabase:types`
- Use Supabase client from `src/lib/supabase.ts`
- Follow RLS patterns for data security

### Debugging
- Use structured logging from `src/lib/simple-logger.ts`
- Chrome DevTools for client-side debugging
- Supabase logs for function debugging
- Edge function inspector on port 8083

## Important Files to Know

- `contador-solo-ai/next.config.ts` - Next.js configuration with performance optimizations
- `contador-solo-ai/eslint.config.mjs` - ESLint configuration (permissive for development)
- `contador-solo-ai/src/lib/supabase.ts` - Supabase client configuration
- `contador-solo-ai/src/lib/openai.ts` - OpenAI client setup
- `supabase/config.toml` - Supabase local development configuration
- `contador-solo-ai/src/types/database.types.ts` - Auto-generated database types

## Brazilian Tax Domain Knowledge

The system includes specialized knowledge for:
- DAS (Documento de Arrecadação do Simples Nacional) calculations
- NFe (Nota Fiscal Eletrônica) processing
- SEFAZ integrations
- Receita Federal API integrations
- Brazilian tax compliance monitoring
- Document classification for Brazilian fiscal documents

This system is specifically designed for the Brazilian market and includes locale-specific calculations, document formats, and compliance requirements.