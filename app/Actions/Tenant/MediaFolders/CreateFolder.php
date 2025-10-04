<?php

namespace App\Actions\Tenant\MediaFolders;

use Lorisleiva\Actions\Concerns\AsAction;
use App\Models\MediaFolder;

class CreateFolder
{
    use AsAction;

    public function handle(string $tenantId, array $data): MediaFolder
    {
        return MediaFolder::create([
            'tenant_id' => $tenantId,
            'name' => $data['name'],
            'parent_id' => $data['parent_id'] ?? null,
            'description' => $data['description'] ?? null,
            'metadata' => $data['metadata'] ?? [],
        ]);
    }
}
