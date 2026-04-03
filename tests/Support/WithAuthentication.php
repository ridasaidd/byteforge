<?php

namespace Tests\Support;

use App\Services\TenantRbacService;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\PermissionRegistrar;
use Tests\Support\TestUsers;

/**
 * Authentication helper trait for API tests.
 *
 * Provides fluent methods for authenticating as different user types.
 *
 * Usage:
 *   // Using seeded users (recommended)
 *   $this->actingAsSuperadmin()->getJson('/api/pages');
 *   $this->actingAsCentralAdmin()->postJson('/api/themes', [...]);
 *   $this->actingAsTenantOwner('tenant-one')->getJson('/api/pages');
 *
 *   // Using custom users
 *   $user = TestUsers::createCentralUser('viewer', ['pages.view']);
 *   $this->actingAsUser($user)->getJson('/api/pages');
 *
 *   // Without authentication (for testing 401 responses)
 *   $this->withoutAuth()->getJson('/api/pages')->assertUnauthorized();
 */
trait WithAuthentication
{
    /**
     * Current authenticated user (for reference in tests).
     */
    protected ?User $currentUser = null;

    // =========================================================================
    // CENTRAL USER AUTHENTICATION (seeded users)
    // =========================================================================

    /**
     * Authenticate as the seeded superadmin user.
     */
    protected function actingAsSuperadmin(): static
    {
        $this->currentUser = TestUsers::centralSuperadmin();
        return $this->actingAs($this->currentUser, 'api');
    }

    /**
     * Authenticate as the seeded admin user.
     */
    protected function actingAsCentralAdmin(): static
    {
        $this->currentUser = TestUsers::centralAdmin();
        return $this->actingAs($this->currentUser, 'api');
    }

    /**
     * Authenticate as the seeded support user.
     */
    protected function actingAsCentralSupport(): static
    {
        $this->currentUser = TestUsers::centralSupport();
        return $this->actingAs($this->currentUser, 'api');
    }

    /**
     * Authenticate as the seeded viewer user.
     */
    protected function actingAsCentralViewer(): static
    {
        $this->currentUser = TestUsers::centralViewer();
        return $this->actingAs($this->currentUser, 'api');
    }

    /**
     * Authenticate as a seeded central user by role name.
     *
     * @param string $role One of: superadmin, admin, support, viewer
     */
    protected function actingAsCentralRole(string $role): static
    {
        $this->currentUser = TestUsers::centralByRole($role);
        return $this->actingAs($this->currentUser, 'api');
    }

    // =========================================================================
    // TENANT USER AUTHENTICATION (seeded users)
    // =========================================================================

    /**
     * Authenticate as the seeded tenant owner.
     *
     * @param string $tenantSlug Tenant slug (default: tenant-one)
     */
    protected function actingAsTenantOwner(string $tenantSlug = 'tenant-one'): static
    {
        $this->currentUser = TestUsers::tenantOwner($tenantSlug);

        $this->normalizeTenantUserAuthContext($this->currentUser, $tenantSlug, 'owner');

        return $this->actingAs($this->currentUser, 'api');
    }

    /**
     * Authenticate as a seeded tenant editor (tenant-one by default).
     */
    protected function actingAsTenantEditor(): static
    {
        $this->currentUser = TestUsers::tenantEditor();

        $this->normalizeTenantUserAuthContext($this->currentUser, 'tenant-one', 'editor');

        return $this->actingAs($this->currentUser, 'api');
    }

    /**
     * Authenticate as a seeded tenant viewer (tenant-one by default).
     */
    protected function actingAsTenantViewer(string $tenantSlug = 'tenant-one'): static
    {
        $this->currentUser = TestUsers::tenantViewer($tenantSlug);

        $this->normalizeTenantUserAuthContext($this->currentUser, $tenantSlug, 'viewer');

        return $this->actingAs($this->currentUser, 'api');
    }

    /**
     * Authenticate as a seeded tenant user by tenant slug.
     *
     * @param string $tenantSlug One of: tenant-one, tenant-two, tenant-three
     */
    protected function actingAsTenantUser(string $tenantSlug): static
    {
        $this->currentUser = TestUsers::tenantBySlug($tenantSlug);

        $membershipRole = $this->currentUser->memberships()
            ->where('tenant_id', str_replace('-', '_', $tenantSlug))
            ->where('status', 'active')
            ->value('role') ?? 'viewer';

        $this->normalizeTenantUserAuthContext($this->currentUser, $tenantSlug, (string) $membershipRole);

        return $this->actingAs($this->currentUser, 'api');
    }

    // =========================================================================
    // CUSTOM USER AUTHENTICATION
    // =========================================================================

    /**
     * Authenticate as a specific user.
     */
    protected function actingAsUser(User $user): static
    {
        $this->currentUser = $user;
        return $this->actingAs($user, 'api');
    }

    /**
     * Authenticate as a user with no permissions.
     */
    protected function actingAsUserWithNoPermissions(): static
    {
        $this->currentUser = TestUsers::createUserWithNoPermissions();
        return $this->actingAs($this->currentUser, 'api');
    }

    /**
     * Authenticate as a user with specific permissions only.
     *
     * @param array<string> $permissions
     */
    protected function actingAsUserWithPermissions(array $permissions): static
    {
        $this->currentUser = TestUsers::createUserWithPermissions($permissions);
        return $this->actingAs($this->currentUser, 'api');
    }

    // =========================================================================
    // HELPERS
    // =========================================================================

    /**
     * Get the currently authenticated user.
     */
    protected function getCurrentUser(): ?User
    {
        return $this->currentUser;
    }

    /**
     * Clear authentication (for testing unauthenticated access).
     */
    protected function withoutAuth(): static
    {
        $this->currentUser = null;
        return $this;
    }

    private function normalizeTenantUserAuthContext(User $user, string $tenantSlug, string $membershipRole): void
    {
        $tenantId = str_replace('-', '_', $tenantSlug);

        app(TenantRbacService::class)->syncUserRoleFromMembership($user, $tenantId, $membershipRole);

        // Tenant fixture users must never carry central/global roles in API tests.
        DB::table('model_has_roles')
            ->where('model_type', $user->getMorphClass())
            ->where('model_id', $user->getKey())
            ->whereNull('team_id')
            ->delete();

        app(PermissionRegistrar::class)->setPermissionsTeamId(null);
    }
}
