<?php

namespace App\Actions\Api\Tenant;

use App\Models\Page;

class DeletePageAction
{
    public function execute(Page $page): bool
    {
        // Optional: Add any cleanup logic here (e.g., delete associated media)

        return $page->delete();
    }
}
