# Testing Credentials

This file contains fixed test data that is seeded with every `php artisan migrate:fresh --seed` command.

---

## Central Admin (Superadmin)

### Super Admin
- **Name:** Super Admin
- **Email:** `admin@byteforge.se`
- **Password:** `password`
- **Type:** `superadmin`
- **Role:** `superadmin`
- **Access:** ByteForge Central Admin Dashboard

**Login URL:** `http://byteforge.se/login` or `http://localhost:8000/login`

---

## Fixed Test Tenants

These tenants have predictable IDs and domains, making them perfect for testing and development:

### Tenant One
- **ID:** `tenant_one`
- **Slug:** `tenant-one`
- **Name:** Tenant One
- **Domain:** `tenant-one.byteforge.se`
- **Email:** `contact@tenant-one.byteforge.se`
- **Phone:** `+46701234567`
- **Status:** `active`
- **Owner:** User With Multiple Tenants

### Tenant Two
- **ID:** `tenant_two`
- **Slug:** `tenant-two`
- **Name:** Tenant Two
- **Domain:** `tenant-two.byteforge.se`
- **Email:** `contact@tenant-two.byteforge.se`
- **Phone:** `+46701234568`
- **Status:** `active`
- **Owner:** User With Multiple Tenants

### Tenant Three
- **ID:** `tenant_three`
- **Slug:** `tenant-three`
- **Name:** Tenant Three
- **Domain:** `tenant-three.byteforge.se`
- **Email:** `contact@tenant-three.byteforge.se`
- **Phone:** `+46701234569`
- **Status:** `active`
- **Owner:** User With One Tenant

## Fixed Test Users

### User With Multiple Tenants
- **Name:** User With Multiple Tenants
- **Email:** `user.multiple@byteforge.test`
- **Password:** `password`
- **Type:** `tenant_user`
- **Tenants:** 
  - Tenant One (owner)
  - Tenant Two (owner)

### User With One Tenant
- **Name:** User With One Tenant
- **Email:** `user.single@byteforge.test`
- **Password:** `password`
- **Type:** `tenant_user`
- **Tenants:** 
  - Tenant Three (owner)

## Usage in Tests

You can use these fixed credentials in your tests:

```php
use App\Models\Tenant;
use App\Models\User;

// Get fixed tenants
$tenantOne = Tenant::find('tenant_one');
$tenantTwo = Tenant::find('tenant_two');
$tenantThree = Tenant::find('tenant_three');

// Get fixed users
$userMultiple = User::where('email', 'user.multiple@byteforge.test')->first();
$userSingle = User::where('email', 'user.single@byteforge.test')->first();

// Test tenant initialization
tenancy()->initialize($tenantOne);
```

## Usage in Development

You can login with these credentials to test the application:

```bash
# Login as user with multiple tenants
Email: user.multiple@byteforge.test
Password: password

# Login as user with single tenant
Email: user.single@byteforge.test
Password: password
```

## DNS Setup for Local Testing

Add these entries to your `/etc/hosts` file (or equivalent):

```
127.0.0.1 tenant-one.byteforge.se
127.0.0.1 tenant-two.byteforge.se
127.0.0.1 tenant-three.byteforge.se
```

Or configure your local DNS resolver to point `*.byteforge.se` to `127.0.0.1`.

## Notes

- These test credentials are **automatically seeded** on every `migrate:fresh --seed`
- The domains are **real subdomains** that need to be configured in DNS (Loopia control panel)
- Random test data is also seeded (additional users, tenants, memberships) for comprehensive testing
- Fixed test data is created by `Database\Seeders\FixedTestDataSeeder`
