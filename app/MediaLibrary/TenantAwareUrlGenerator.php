<?php
/**
 * This custom path generator ensures that media files are stored in tenant-specific directories.
 * Adjust the logic as needed to fit your tenant identification method.
 * For example, using tenant ID, subdomain, or any other unique identifier.
 * Make sure to register this path generator in your media library configuration.
 */
namespace App\MediaLibrary;

use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Spatie\MediaLibrary\Support\PathGenerator\DefaultPathGenerator;

class TenantAwarePathGenerator extends DefaultPathGenerator
{
    protected function getBasePath(Media $media): string
    {
        $tenantSubdomain = app('currentTenant')->subdomain; // Adjust this based on your tenant identification logic

        return "{$tenantSubdomain}/{$media->getKey()}";
    }
}
