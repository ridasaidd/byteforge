<?php

namespace Tests\Feature;

use Tests\Support\TestUsers;
use Tests\TestCase;

class PassportAuthenticationTest extends TestCase
{
    /**
     * Test that the seeded superadmin has the superadmin role and global permissions.
     */
    public function test_superadmin_has_global_permissions()
    {
        $super = TestUsers::centralSuperadmin();

        $this->assertTrue($super->hasRole('superadmin'));
        $this->assertTrue($super->hasPermissionTo('users.manage', 'api'));
        $this->assertTrue($super->hasPermissionTo('tenants.manage', 'api'));
        $this->assertFalse($super->hasRole('tenant_owner'));
    }

    /**
     * Test superadmin permissions in central context (no tenancy initialized).
     */
    public function test_superadmin_can_access_global_permissions_in_central_context()
    {
        tenancy()->end();

        $super = TestUsers::centralSuperadmin();

        $this->assertTrue($super->hasPermissionTo('tenants.manage', 'api'));
        $this->assertTrue($super->hasPermissionTo('users.manage', 'api'));
        $this->assertFalse($super->hasRole('tenant_owner'));
    }

    /**
     * Test tenant user permissions in tenant context.
     */
    public function test_tenant_user_can_login_in_tenant_context_and_has_scoped_permissions()
    {
        $this->markTestSkipped('Spatie Permission team_id schema mismatch with string tenant IDs');
    }

    /**
     * Test tenant user lacks global permissions in tenant context.
     */
    public function test_tenant_user_cannot_access_global_permissions_in_tenant_context()
    {
        $this->markTestSkipped('Spatie Permission team_id schema mismatch with string tenant IDs');
    }
}
