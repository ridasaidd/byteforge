# Authentication & Authorization Strategy

## 🔐 **Authentication Flow (Laravel Passport + React)**

### **Option 1: HTTPOnly Cookies (RECOMMENDED for same-domain)**

**Best for:** Central admin and tenant dashboards on same domain/subdomain

#### **Backend Setup (Laravel):**

```php
// routes/api.php or web.php
Route::post('/auth/login', function (Request $request) {
    $credentials = $request->validate([
        'email' => 'required|email',
        'password' => 'required',
    ]);

    if (!Auth::attempt($credentials)) {
        return response()->json(['message' => 'Invalid credentials'], 401);
    }

    $user = Auth::user();
    $token = $user->createToken('web')->accessToken;

    // Store token in HTTPOnly cookie
    return response()->json([
        'user' => $user->load('roles', 'permissions'),
    ])->cookie(
        'auth_token',
        $token,
        60 * 24 * 7, // 7 days
        '/',
        config('session.domain'), // '.byteforge.se' for subdomains
        true, // Secure (HTTPS only)
        true, // HTTPOnly (no JavaScript access)
        false, // Raw
        'lax' // SameSite
    );
});

Route::post('/auth/logout', function () {
    Auth::user()->token()->revoke();
    
    return response()->json(['message' => 'Logged out'])
        ->cookie('auth_token', '', -1); // Clear cookie
})->middleware('auth:api');

Route::get('/auth/user', function () {
    return Auth::user()->load('roles', 'permissions');
})->middleware('auth:api');
```

#### **Frontend Changes:**

```typescript
// shared/services/http.ts
import axios from 'axios';

class HttpService {
  private client;

  constructor() {
    this.client = axios.create({
      baseURL: '/api',
      withCredentials: true, // ⚠️ CRITICAL: Send cookies with requests
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    // No need for request interceptor - cookie sent automatically!

    // Response interceptor - handle 401
    this.client.interceptors.response.use(
      (response) => response.data,
      (error) => {
        if (error.response?.status === 401) {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // ... rest of methods
}
```

```typescript
// shared/services/auth.service.ts
class AuthService {
  async login(credentials: { email: string; password: string }) {
    // Cookie is set by server response
    const { user } = await http.post<{ user: User }>('/auth/login', credentials);
    return { user }; // No token needed!
  }

  async logout() {
    await http.post('/auth/logout'); // Cookie cleared by server
    window.location.href = '/login';
  }

  async getUser() {
    return http.get<User>('/auth/user');
  }

  isAuthenticated() {
    // Can't check cookie from JS - just try to fetch user
    // Or use a flag in memory
    return true; // Trust the server
  }
}
```

**Pros:**
✅ XSS-safe (HTTPOnly)
✅ Automatic with every request
✅ CSRF protection via Laravel
✅ Works across subdomains

**Cons:**
❌ Requires same-domain or CORS setup
❌ Can't read token in JavaScript
❌ Need CSRF token for state-changing requests

---

### **Option 2: localStorage (CURRENT - Acceptable with Caveats)**

**Best for:** SPA with API on different domain, mobile apps

**Keep if:**
- ✅ You have good Content Security Policy (CSP)
- ✅ You sanitize all user input (prevent XSS)
- ✅ You use short-lived tokens (15-30 min)
- ✅ You implement refresh tokens

**Improve current implementation:**

```typescript
// shared/services/auth.service.ts
interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number; // seconds
  user: User;
}

class AuthService {
  private tokenExpiryTimer: number | null = null;

  async login(credentials: { email: string; password: string }) {
    const response = await http.post<TokenResponse>('/auth/login', credentials);
    
    // Store tokens
    localStorage.setItem('auth_token', response.access_token);
    localStorage.setItem('refresh_token', response.refresh_token);
    localStorage.setItem('token_expires_at', 
      String(Date.now() + response.expires_in * 1000)
    );

    // Auto-refresh before expiry
    this.scheduleTokenRefresh(response.expires_in);

    return { user: response.user, token: response.access_token };
  }

  async refreshToken() {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) throw new Error('No refresh token');

    const response = await http.post<TokenResponse>('/auth/refresh', {
      refresh_token: refreshToken,
    });

    localStorage.setItem('auth_token', response.access_token);
    localStorage.setItem('token_expires_at', 
      String(Date.now() + response.expires_in * 1000)
    );

    this.scheduleTokenRefresh(response.expires_in);
  }

  private scheduleTokenRefresh(expiresIn: number) {
    if (this.tokenExpiryTimer) clearTimeout(this.tokenExpiryTimer);
    
    // Refresh 5 minutes before expiry
    const refreshIn = (expiresIn - 300) * 1000;
    this.tokenExpiryTimer = window.setTimeout(() => {
      this.refreshToken();
    }, refreshIn);
  }

  isTokenExpired(): boolean {
    const expiresAt = localStorage.getItem('token_expires_at');
    if (!expiresAt) return true;
    return Date.now() > parseInt(expiresAt);
  }
}
```

**Add to http.ts:**

```typescript
// shared/services/http.ts
this.client.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;

    // Token expired - try refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        await authService.refreshToken();
        // Retry original request with new token
        return this.client(originalRequest);
      } catch (refreshError) {
        // Refresh failed - logout
        localStorage.clear();
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);
```

---

## 🛡️ **Authorization (Spatie Roles & Permissions)**

### **Backend - Include Roles in User Response:**

```php
// app/Http/Controllers/AuthController.php
public function user(Request $request)
{
    return $request->user()->load([
        'roles.permissions',
        'permissions',
    ]);
}
```

### **Frontend - Permission Checking:**

```typescript
// shared/types/index.ts
export interface Permission {
  id: string;
  name: string;
  guard_name: string;
}

export interface Role {
  id: string;
  name: string;
  guard_name: string;
  permissions: Permission[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  roles: Role[];
  permissions: Permission[];
}
```

```typescript
// shared/hooks/usePermissions.ts
import { useAuth } from './useAuth';

export function usePermissions() {
  const { user } = useAuth();

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;

    // Direct permissions
    if (user.permissions?.some(p => p.name === permission)) {
      return true;
    }

    // Role permissions
    return user.roles?.some(role =>
      role.permissions?.some(p => p.name === permission)
    );
  };

  const hasRole = (roleName: string): boolean => {
    if (!user) return false;
    return user.roles?.some(role => role.name === roleName) ?? false;
  };

  const hasAnyRole = (roleNames: string[]): boolean => {
    return roleNames.some(hasRole);
  };

  const hasAllRoles = (roleNames: string[]): boolean => {
    return roleNames.every(hasRole);
  };

  return {
    hasPermission,
    hasRole,
    hasAnyRole,
    hasAllRoles,
    isSuperAdmin: hasRole('superadmin'),
  };
}
```

### **Usage in Components:**

```typescript
// Example: Tenants page
import { usePermissions } from '@/shared/hooks/usePermissions';

export function TenantsPage() {
  const { hasPermission, isSuperAdmin } = usePermissions();

  return (
    <div>
      {hasPermission('view-tenants') && (
        <TenantsList />
      )}

      {hasPermission('create-tenants') && (
        <Button onClick={createTenant}>Create Tenant</Button>
      )}

      {isSuperAdmin && (
        <DangerZone />
      )}
    </div>
  );
}
```

### **Protected Routes:**

```typescript
// shared/components/ProtectedRoute.tsx
interface ProtectedRouteProps {
  children: ReactNode;
  permission?: string;
  role?: string;
  fallback?: ReactNode;
}

export function ProtectedRoute({ 
  children, 
  permission, 
  role, 
  fallback = <Navigate to="/dashboard" /> 
}: ProtectedRouteProps) {
  const { hasPermission, hasRole } = usePermissions();

  if (permission && !hasPermission(permission)) {
    return <>{fallback}</>;
  }

  if (role && !hasRole(role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
```

```typescript
// apps/central/App.tsx
<Routes>
  <Route path="/tenants" element={
    <ProtectedRoute permission="view-tenants">
      <TenantsPage />
    </ProtectedRoute>
  } />

  <Route path="/settings" element={
    <ProtectedRoute role="superadmin">
      <SettingsPage />
    </ProtectedRoute>
  } />
</Routes>
```

---

## 🎯 **Recommendation for ByteForge**

### **Use HTTPOnly Cookies Because:**

1. ✅ Central admin is on same domain (`byteforge.se`)
2. ✅ Tenant dashboards are subdomains (`{tenant}.byteforge.se`)
3. ✅ Better security (XSS protection)
4. ✅ Laravel has built-in CSRF protection
5. ✅ Simpler frontend code (no token management)

### **Migration Steps:**

1. Update backend login/logout endpoints to use cookies
2. Add `withCredentials: true` to axios
3. Remove `localStorage` token operations
4. Add CSRF token to forms (Laravel handles this)
5. Test CORS settings for subdomains

### **Content Security Policy (CSP):**

Add to `public/index.php` or `.htaccess`:

```php
// In public/index.php or middleware
header("Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';");
```

---

## 📋 **Quick Comparison**

| Feature | localStorage | HTTPOnly Cookies |
|---------|-------------|------------------|
| XSS Safe | ❌ No | ✅ Yes |
| CSRF Protection | ✅ Yes (token in header) | ⚠️ Need CSRF token |
| Cross-domain | ✅ Yes | ❌ Tricky |
| Mobile Apps | ✅ Easy | ❌ Hard |
| Same-domain SPA | ⚠️ OK | ✅ Best |
| Auto-send | ❌ No | ✅ Yes |
| Token Refresh | ⚠️ Manual | ⚠️ Manual |

---

## 🚀 **Next Steps**

**If keeping localStorage:**
- Add refresh token logic
- Add token expiry checks
- Add CSP headers
- Implement auto-refresh

**If switching to cookies:**
- Update backend endpoints
- Add `withCredentials` to axios
- Remove localStorage operations
- Test subdomain access

What do you prefer? I can help implement either approach! 🤔
