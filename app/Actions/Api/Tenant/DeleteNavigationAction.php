<?php

namespace App\Actions\Api\Tenant;

use App\Models\Navigation;
use Lorisleiva\Actions\Concerns\AsAction;

class DeleteNavigationAction
{
    use AsAction;

    public function execute(Navigation $navigation)
    {
        return $navigation->delete();
    }
}
