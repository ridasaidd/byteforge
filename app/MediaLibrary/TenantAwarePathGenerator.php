<?php

namespace App\MediaLibrary;

use Spatie\MediaLibrary\MediaCollections\Models\Media;
use Spatie\MediaLibrary\Support\PathGenerator\PathGenerator;

class TenantAwarePathGenerator implements PathGenerator
{
    /**
     * Get the path for the given media, relative to the root storage path.
     */
    public function getPath(Media $media): string
    {
        return $this->getBasePath($media).'/';
    }

    /**
     * Get the path for conversions of the given media, relative to the root storage path.
     */
    public function getPathForConversions(Media $media): string
    {
        return $this->getBasePath($media).'/conversions/';
    }

    /**
     * Get the path for responsive images of the given media, relative to the root storage path.
     */
    public function getPathForResponsiveImages(Media $media): string
    {
        return $this->getBasePath($media).'/responsive-images/';
    }

    /**
     * Get the base path for the given media.
     * Organized by:
     * - Central users: central/media/{model_type}/{model_id}/{media_id}
     * - Tenant users: tenants/{tenant_id}/media/{media_id}
     */
    protected function getBasePath(Media $media): string
    {
        $tenantId = $media->tenant_id ?? null;

        // If no tenant_id, this is central admin media
        if ($tenantId === null) {
            // Get the model type (e.g., "users", "settings")
            $modelType = $media->model_type ? strtolower(class_basename($media->model_type)) : 'unknown';
            $modelId = $media->model_id ?? 'unknown';

            return "central/{$modelType}/{$modelId}/{$media->getKey()}";
        }

        // Tenant-specific media
        return "tenants/{$tenantId}/media/{$media->getKey()}";
    }
}
