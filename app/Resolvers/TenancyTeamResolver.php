<?php

namespace App\Resolvers;

use Spatie\Permission\Contracts\PermissionsTeamResolver;

class TenancyTeamResolver implements PermissionsTeamResolver
{
    protected int|string|null $teamId = null;

    public function getPermissionsTeamId(): int|string|null
    {
        return tenancy()->tenant?->id ?? $this->teamId;
    }

    public function setPermissionsTeamId($id): void
    {
        if ($id instanceof \Illuminate\Database\Eloquent\Model) {
            $id = $id->getKey();
        }
        $this->teamId = $id;
    }
}
