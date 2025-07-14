# PersonaLink Test Suite

This directory contains comprehensive tests for the PersonaLink application, covering all major components, API routes, and business logic.

## 🧪 Test Structure

```
__tests__/
├── components/           # UI Component tests
│   └── ui/              # Reusable UI components
├── app/                 # Application tests
│   ├── (auth)/          # Authentication pages
│   ├── api/             # API route tests
│   ├── hooks/           # Custom hooks tests
│   └── providers/       # Context providers tests
├── lib/                 # Library/utility tests
│   └── matching/        # Matching engine tests
└── README.md           # This file
```

## 🚀 Running Tests

### All Tests
```bash
npm test
```

### Watch Mode (Development)
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:coverage
```

### CI Mode
```bash
npm run test:ci
```

### Specific Test Categories
```bash
# Unit tests (components only)
npm run test:unit

# Integration tests (app functionality)
npm run test:integration

# API tests only
npm run test:api

# Library tests only
npm run test:lib
```

## 📋 Test Categories

### 1. Component Tests (`components/`)
Tests for reusable UI components ensuring they render correctly and handle user interactions.

**Coverage:**
- ✅ Button component (variants, sizes, states)
- ✅ Input component (validation, types, icons)
- ✅ Card components (all sub-components)
- ✅ Avatar, Badge, Progress components
- ✅ Form components and validation

### 2. Authentication Tests (`app/(auth)/`)
Tests for login, registration, and authentication flows.

**Coverage:**
- ✅ Login page (email, phone, Google OAuth)
- ✅ Registration page (form validation, email verification)
- ✅ Password reset flow
- ✅ OAuth callback handling
- ✅ Form validation and error handling

### 3. API Route Tests (`app/api/`)
Tests for all API endpoints ensuring proper responses and error handling.

**Coverage:**
- ✅ Health check endpoint
- ✅ User profile API (GET/PUT)
- ✅ Chat API routes (messages, list)
- ✅ Matching API routes (candidates, like, pass)
- ✅ Payment API routes
- ✅ Authentication and authorization

### 4. Hook Tests (`app/hooks/`)
Tests for custom React hooks ensuring proper state management.

**Coverage:**
- ✅ useChat hook (WebSocket, messaging)
- ✅ useAuth hook (authentication state)
- ✅ useToast hook (notifications)

### 5. Provider Tests (`app/providers/`)
Tests for React context providers.

**Coverage:**
- ✅ AuthProvider (authentication state management)
- ✅ Theme provider
- ✅ Toast provider

### 6. Library Tests (`lib/`)
Tests for business logic and utilities.

**Coverage:**
- ✅ Matching engine (compatibility scoring)
- ✅ Database utilities
- ✅ Utility functions

## 🎯 Test Coverage Goals

- **Components**: 95%+ coverage
- **API Routes**: 90%+ coverage
- **Business Logic**: 95%+ coverage
- **Hooks**: 90%+ coverage
- **Overall**: 85%+ coverage

## 🔧 Test Configuration

### Jest Configuration (`jest.config.js`)
- Next.js integration
- TypeScript support
- Module path mapping
- Coverage collection
- Test environment setup

### Test Setup (`jest.setup.js`)
- DOM testing library setup
- Mock configurations
- Global test utilities
- Environment variable setup

## 🧩 Mocking Strategy

### External Services
- **Supabase**: Mocked database operations
- **OpenAI**: Mocked AI responses
- **Stripe**: Mocked payment processing
- **Twilio**: Mocked SMS services
- **WebSocket**: Mocked real-time connections

### Browser APIs
- **fetch**: Mocked HTTP requests
- **localStorage/sessionStorage**: Mocked storage
- **WebSocket**: Mocked real-time communication
- **IntersectionObserver**: Mocked for component testing

### Next.js Features
- **Router**: Mocked navigation
- **Headers**: Mocked request/response headers
- **Cookies**: Mocked session management

## 📊 Test Reports

### Coverage Report
After running `npm run test:coverage`, view the detailed coverage report:

```bash
# Open coverage report in browser
open coverage/lcov-report/index.html
```

### Test Results
- ✅ Passed tests
- ❌ Failed tests
- ⏱️ Test execution time
- 📈 Performance metrics

## 🐛 Debugging Tests

### Debug Mode
```bash
# Run tests in debug mode
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Verbose Output
```bash
# Show detailed test output
npm test -- --verbose
```

### Single Test File
```bash
# Run specific test file
npm test -- Button.test.tsx
```

### Watch Mode with Filter
```bash
# Watch mode with pattern matching
npm run test:watch -- --testNamePattern="Button"
```

## 🚨 Common Issues

### 1. Import Errors
- Ensure all imports use the correct path aliases
- Check that mocked modules are properly configured

### 2. Async Test Failures
- Use `waitFor` for asynchronous operations
- Ensure proper cleanup in `afterEach` hooks

### 3. Mock Issues
- Reset mocks in `beforeEach` hooks
- Ensure mock implementations match expected interfaces

### 4. Environment Variables
- Set required environment variables in `jest.setup.js`
- Use `.env.test` for test-specific configuration

## 📝 Writing New Tests

### Component Test Template
```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { ComponentName } from '@/components/ComponentName'

describe('ComponentName', () => {
  it('renders correctly', () => {
    render(<ComponentName />)
    expect(screen.getByText('Expected Text')).toBeInTheDocument()
  })

  it('handles user interactions', () => {
    render(<ComponentName />)
    fireEvent.click(screen.getByRole('button'))
    // Assert expected behavior
  })
})
```

### API Test Template
```typescript
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/route'

describe('API Route', () => {
  it('handles GET requests', async () => {
    const request = new NextRequest('http://localhost:3000/api/route')
    const response = await GET(request)
    expect(response.status).toBe(200)
  })
})
```

### Hook Test Template
```typescript
import { renderHook, act } from '@testing-library/react'
import { useCustomHook } from '@/hooks/useCustomHook'

describe('useCustomHook', () => {
  it('returns expected initial state', () => {
    const { result } = renderHook(() => useCustomHook())
    expect(result.current.value).toBe(expectedValue)
  })
})
```

## 🔄 Continuous Integration

### GitHub Actions
Tests are automatically run on:
- Pull requests
- Push to main branch
- Release tags

### Pre-commit Hooks
- Lint check
- Type checking
- Unit tests
- Integration tests

## 📈 Performance Testing

### Load Testing
```bash
# Run performance tests
npm run test:performance
```

### Memory Leak Detection
```bash
# Run with memory profiling
npm run test:memory
```

## 🎉 Contributing

When adding new features:
1. Write tests first (TDD approach)
2. Ensure all tests pass
3. Maintain or improve coverage
4. Update this README if needed

## 📞 Support

For test-related issues:
1. Check the test logs for detailed error messages
2. Verify mock configurations
3. Ensure environment variables are set
4. Check for breaking changes in dependencies 