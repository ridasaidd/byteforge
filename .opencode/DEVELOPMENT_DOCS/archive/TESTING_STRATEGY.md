# Testing Strategy - ByteForge Frontend

## ✅ **What We Test**

### **1. Utility Functions** (HIGH VALUE)
✅ `cn()` - Class name merging utility
- Handles conditional classes
- Merges Tailwind conflicts
- Handles null/undefined values

**Location:** `resources/js/shared/__tests__/cn.test.ts`

### **2. Services - Simple Methods** (HIGH VALUE)
✅ `authService` - Token management
- `getToken()` - Retrieves from localStorage
- `isAuthenticated()` - Checks token existence

**Location:** `resources/js/shared/__tests__/auth.service.test.ts`

**Skipped:** Login/logout methods (require complex axios mocking, better for E2E tests)

### **3. Custom Hooks** (MEDIUM VALUE)
✅ `useAuth` - Throws error when used outside AuthProvider
✅ `useTenant` - Throws error when used outside TenantProvider

**Location:** `resources/js/shared/__tests__/useAuth.test.tsx`, `useTenant.test.tsx`

---

## ❌ **What We Don't Test**

### **UI Components**
- ❌ **shadcn/ui components** - Already tested by library
- ❌ **Simple presentational components** (Logo, PageHeader, EmptyState) - No logic to test
- ❌ **Layout components** (DashboardLayout, TopBar, Drawer) - Mostly composition, fragile tests

### **Complex Integrations**
- ❌ **Axios interceptors** - Require complex mocking, brittle tests
- ❌ **Login/logout flows** - API integration, better for E2E tests
- ❌ **Context providers** - Complex mocking of React hooks, better for integration tests
- ❌ **Router navigation** - Better tested manually or via E2E

---

## 📊 **Current Test Coverage**

```bash
npm run test:run
```

**Results:**
- ✅ 4 test files
- ✅ 10 tests passing
- ⚡ ~2.7s execution time

---

## 🎯 **Testing Philosophy**

### **Unit Tests (Current)**
- ✅ Pure functions
- ✅ Simple utilities
- ✅ localStorage operations
- ✅ Error boundary checks

### **Integration Tests (Future)**
- 🔄 Context providers with real hooks
- 🔄 Component interactions
- 🔄 Form submissions

### **E2E Tests (Future)**
- 🔄 Login → Dashboard flow
- 🔄 CRUD operations
- 🔄 Navigation between pages
- 🔄 API error handling

---

## 🛠️ **Test Commands**

```bash
# Run all tests
npm run test

# Run tests once (CI mode)
npm run test:run

# Run with UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

---

## 📝 **Testing Best Practices**

### **DO:**
- ✅ Test pure functions and utilities
- ✅ Test error cases
- ✅ Test edge cases (null, undefined, empty strings)
- ✅ Use descriptive test names
- ✅ Keep tests simple and focused

### **DON'T:**
- ❌ Test implementation details
- ❌ Mock everything (leads to brittle tests)
- ❌ Test UI component rendering (unless complex logic)
- ❌ Test third-party libraries
- ❌ Write tests for the sake of coverage

---

## 🚀 **Future Improvements**

1. **Add Playwright/Cypress** for E2E testing
2. **Add integration tests** for context providers
3. **Add visual regression tests** (Storybook + Chromatic)
4. **Add API mocking** (MSW) for component tests
5. **Add coverage thresholds** in CI/CD

---

## 📚 **Resources**

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

## 🔍 **Test File Locations**

```
resources/js/shared/__tests__/
├── auth.service.test.ts     # Auth service token methods
├── cn.test.ts               # Class name utility
├── useAuth.test.tsx         # useAuth hook error check
└── useTenant.test.tsx       # useTenant hook error check
```

---

## ⚡ **Quick Test Guide**

**Want to add a test for a new utility?**

1. Create `__tests__/your-utility.test.ts` in the same directory
2. Import the utility and test pure functions
3. Use `describe()` and `it()` for structure
4. Run `npm run test` to verify

**Example:**

```typescript
import { describe, it, expect } from 'vitest';
import { myUtility } from '../utils/myUtility';

describe('myUtility', () => {
  it('should do something', () => {
    const result = myUtility('input');
    expect(result).toBe('expected');
  });
});
```

---

**Last Updated:** October 12, 2025  
**Test Framework:** Vitest 3.2.4  
**Status:** ✅ All 10 tests passing
