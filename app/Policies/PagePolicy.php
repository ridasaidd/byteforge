<?php

namespace App\Policies;

use App\Models\Page;
use App\Models\User;

class PagePolicy
{
    /**
     * Determine if the user can view any pages.
     */
    public function viewAny(User $user): bool
    {
        return $user->can('pages.view');
    }

    /**
     * Determine if the user can view the page.
     */
    public function view(User $user, Page $page): bool
    {
        // Ensure page belongs to current tenant (unless super admin)
        if ($user->type !== 'superadmin') {
            if (!tenancy()->tenant || $page->tenant_id !== tenancy()->tenant->id) {
                return false;
            }
        }

        return $user->can('pages.view');
    }

    /**
     * Determine if the user can create pages.
     */
    public function create(User $user): bool
    {
        return $user->can('pages.create');
    }

    /**
     * Determine if the user can update the page.
     */
    public function update(User $user, Page $page): bool
    {
        // Ensure page belongs to current tenant (unless super admin)
        if ($user->type !== 'superadmin') {
            if (!tenancy()->tenant || $page->tenant_id !== tenancy()->tenant->id) {
                return false;
            }
        }

        return $user->can('pages.edit');
    }

    /**
     * Determine if the user can delete the page.
     */
    public function delete(User $user, Page $page): bool
    {
        // Ensure page belongs to current tenant (unless super admin)
        if ($user->type !== 'superadmin') {
            if (!tenancy()->tenant || $page->tenant_id !== tenancy()->tenant->id) {
                return false;
            }
        }

        return $user->can('pages.delete');
    }
}
