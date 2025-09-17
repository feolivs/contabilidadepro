---
type: "agent_requested"
description: "Example description"
---

# ContabilidadePRO - System Architecture

## Overview
ContabilidadePRO is a modern AI-powered accounting platform specifically designed for autonomous Brazilian accountants. The system leverages cutting-edge technologies to automate routine accounting tasks, provide intelligent assistance, and streamline compliance with Brazilian fiscal regulations.

## System Architecture

### High-Level Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   External      │
│   (Next.js)     │◄───┤   (Supabase)    │◄───┤   Services      │
│                 │    │                 │    │                 │
│ • React 19      │    │ • PostgreSQL    │    │ • OpenAI GPT-4  │
│ • TypeScript    │    │ • Edge Functions │    │ • Azure OCR     │
│ • Tailwind CSS  │    │ • Real-time API │    │ • Brazilian Gov │
│ • Zustand       │    │ • Auth Service  │    │   APIs          │
│ • React Query   │    │ • File Storage  │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Technology Stack

### Frontend Technologies
- **Next.js 15.5.3** - React framework with App Router
- **React 19.1.0** - UI library with latest features
- **TypeScript 5** - Type-safe JavaScript
- **Tailwind CSS 4** - Utility-first CSS framework
- **Shadcn/UI** - Component library built on Radix UI
- **Framer Motion 12.23.12** - Animation library
- **Lucide React** - Icon system

### State Management & Data Fetching
- **Zustand 5.0.8** - Lightweight state management
- **TanStack React Query 5.87.4** - Server state management
- **React Hook Form 7.62.0** - Form management
- **Zod 4.1.8** - Schema validation

### Backend Technologies (Supabase BaaS)
- **PostgreSQL** - Primary database
- **Supabase Auth** - Authentication service
- **Supabase Edge Functions** - Serverless functions
- **Supabase Realtime** - WebSocket connections
- **Supabase Storage** - File storage service

### AI & External Services
- **OpenAI GPT-4** - AI assistant and automation
- **Azure Document Intelligence** - OCR and document processing
- **pgvector** - Vector database for semantic search
- **Brazilian Government APIs** - Fiscal compliance

## Application Structure

### Directory Organization
```
contador-solo-ai/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Home page
│   │   ├── login/              # Authentication
│   │   └── dashboard/          # Main dashboard
│   ├── components/
│   │   ├── ui/                 # Base UI components
│   │   ├── layout/             # Layout components
│   │   └── chat/               # AI chat interface
│   ├── hooks/                  # Custom React hooks
│   ├── lib/                    # Utilities and configs
│   ├── store/                  # Zustand stores
│   └── types/                  # TypeScript definitions
├── public/                     # Static assets
└── ...config files
```

## Core Features

### ✅ Implemented Features

#### 1. Authentication System
- **Location**: `src/app/login/page.tsx`
- **Features**: 
  - Email/password authentication
  - Google OAuth integration
  - Form validation with Zod schemas
  - Persistent session management
  - Test bypass for development

#### 2. Dashboard
- **Location**: `src/app/dashboard/page.tsx`
- **Features**:
  - Real-time metrics display
  - Client and document counters
  - Revenue tracking
  - Upcoming deadlines
  - Recent tasks management

#### 3. AI Assistant
- **Location**: `src/components/chat/ai-chat.tsx`
- **Features**:
  - Real-time chat interface
  - Message history
  - Integration with OpenAI GPT-4
  - Context-aware responses

#### 4. Layout System
- **Location**: `src/components/layout/`
- **Features**:
  - Responsive sidebar navigation
  - Mobile-friendly header
  - User profile management
  - Search functionality

### 🚧 In Development
- Document upload and processing
- Automatic DAS calculation
- Client management system
- Automated report generation
- Bank reconciliation
- Fiscal deadline management

### 🔮 Planned Features
- Mobile application (React Native)
- Integration with Brazilian Federal Revenue
- Predictive analysis and insights
- Service marketplace
- Multi-company support

## Database Schema

### Core Tables
```sql
-- Companies/Clients
empresas (
  id: uuid PRIMARY KEY,
  nome: text,
  cnpj: text,
  created_at: timestamp,
  updated_at: timestamp
)

-- Dashboard aggregation function
get_dashboard_complete() RETURNS json
```

### Planned Schema Extensions
- **documents** - Document storage and metadata
- **transactions** - Financial transactions
- **deadlines** - Fiscal deadlines and compliance
- **ai_conversations** - Chat history and context
- **reports** - Generated reports and templates

## API Design

### Supabase Edge Functions
- **AI Chat**: `/functions/chat` - Handles AI conversations
- **Document Processing**: `/functions/process-document` - OCR and extraction
- **DAS Calculation**: `/functions/calculate-das` - Automatic tax calculations
- **Report Generation**: `/functions/generate-report` - PDF report creation

### Third-party Integrations
- **OpenAI API** - GPT-4 for AI assistance
- **Azure Document Intelligence** - OCR services
- **Brazilian Government APIs** - Tax compliance data

## State Management Architecture

### Client State (Zustand)
```typescript
// Authentication state
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
}

// Dashboard state
interface DashboardState {
  metrics: DashboardMetrics;
  recentTasks: Task[];
  upcomingDeadlines: Deadline[];
  fetchDashboardData: () => Promise<void>;
}
```

### Server State (React Query)
- Caching strategies for dashboard data
- Background refetching for real-time updates
- Optimistic updates for better UX
- Error handling and retry logic

## Security Architecture

### Authentication & Authorization
- **Supabase Auth** with JWT tokens
- Row Level Security (RLS) policies
- Session management with secure cookies
- Multi-factor authentication (planned)

### Data Protection
- End-to-end encryption for sensitive data
- LGPD compliance for Brazilian data protection
- Audit trails for all operations
- Secure file storage with access controls

### API Security
- Rate limiting on Edge Functions
- Input validation with Zod schemas
- CORS configuration
- Request logging and monitoring

## Deployment Architecture

### Environment Configuration
- **Development**: Local Next.js with Supabase cloud
- **Staging**: Vercel preview deployments
- **Production**: Vercel with Supabase production

### Infrastructure Components
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Vercel      │    │    Supabase     │    │   External      │
│                 │    │                 │    │   Services      │
│ • Next.js App   │    │ • PostgreSQL    │    │ • OpenAI        │
│ • Edge Runtime  │    │ • Edge Functions │    │ • Azure         │
│ • Static Assets │    │ • File Storage  │    │ • Gov APIs      │
│ • CDN           │    │ • Realtime      │    │ • Analytics     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Scalability Considerations
- **Frontend**: Vercel's global CDN and edge runtime
- **Backend**: Supabase auto-scaling PostgreSQL
- **Storage**: Distributed file storage
- **Caching**: Redis for session and query caching

## Development Workflow

### Code Quality & Standards
- **Biome** for code formatting and linting
- **TypeScript** with strict type checking
- **Prettier** with Tailwind CSS plugin
- **Husky** for pre-commit hooks
- **lint-staged** for staged file processing

### Testing Strategy (Planned)
- **Unit Tests**: Jest + Testing Library
- **Integration Tests**: Cypress/Playwright
- **E2E Tests**: Playwright with real data
- **Performance Tests**: Lighthouse CI
- **Security Tests**: SAST/DAST tools

### CI/CD Pipeline
- **Git Workflow**: Feature branches with PR reviews
- **Automated Testing**: Run on all PRs
- **Preview Deployments**: Vercel preview URLs
- **Production Deployment**: Auto-deploy from main branch
- **Database Migrations**: Supabase migration system

## Performance Optimization

### Frontend Optimization
- **Code Splitting**: Dynamic imports for large components
- **Image Optimization**: Next.js Image component
- **Bundle Analysis**: webpack-bundle-analyzer
- **Caching**: Service worker for offline support

### Backend Optimization
- **Database Indexing**: Optimized queries with proper indexes
- **Connection Pooling**: Supabase connection management
- **Query Optimization**: React Query for efficient data fetching
- **CDN**: Global asset distribution

## Monitoring & Analytics

### Application Monitoring
- **Vercel Analytics** for performance metrics
- **Supabase Metrics** for database performance
- **Error Tracking**: Sentry integration (planned)
- **User Analytics**: Privacy-focused analytics

### Business Metrics
- **User Engagement**: Dashboard usage patterns
- **Feature Adoption**: AI assistant utilization
- **Performance KPIs**: Document processing times
- **Revenue Metrics**: Subscription and usage tracking

---

*This architecture document reflects the current implementation and planned features of the ContabilidadePRO system as of January 2025.*