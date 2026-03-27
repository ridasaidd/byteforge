<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\MechanicWorkshop;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

class WorkshopSearchService
{
    /**
     * Search for mechanic workshops within a tenant by location and optional filters.
     *
     * @param string      $tenantId  Scopes results to the given tenant.
     * @param float|null  $lat       Latitude of the user's position.
     * @param float|null  $lng       Longitude of the user's position.
     * @param float       $radiusKm  Maximum distance in kilometres (default 50).
     * @param string|null $city      Optional city filter (case-insensitive prefix match).
     * @param string|null $query     Optional free-text filter on name / description.
     * @param int         $perPage   Results per page.
     */
    public function search(
        string $tenantId,
        ?float $lat = null,
        ?float $lng = null,
        float $radiusKm = 50,
        ?string $city = null,
        ?string $query = null,
        int $perPage = 15,
    ): LengthAwarePaginator {
        $builder = MechanicWorkshop::query()
            ->forTenant($tenantId)
            ->active()
            ->with(['services' => fn ($q) => $q->active()->orderBy('sort_order')]);

        if ($lat !== null && $lng !== null) {
            $builder->nearby($lat, $lng, $radiusKm);
        }

        if ($city !== null && $city !== '') {
            $safeCity = str_replace(['%', '_'], ['\%', '\_'], $city);
            $builder->where('city', 'like', "{$safeCity}%");
        }

        if ($query !== null && $query !== '') {
            $safeQuery = str_replace(['%', '_'], ['\%', '\_'], $query);
            $builder->where(function ($q) use ($safeQuery) {
                $q->where('name', 'like', "%{$safeQuery}%")
                    ->orWhere('description', 'like', "%{$safeQuery}%");
            });
        }

        // When no geo sort is applied, fall back to highest-rated first.
        if ($lat === null || $lng === null) {
            $builder->orderByDesc('rating_average');
        }

        return $builder->paginate(min($perPage, 100));
    }

    /**
     * Return a list of distinct cities that have active workshops for a tenant.
     *
     * @return Collection<int, string>
     */
    public function availableCities(string $tenantId): Collection
    {
        return MechanicWorkshop::query()
            ->forTenant($tenantId)
            ->active()
            ->whereNotNull('city')
            ->distinct()
            ->orderBy('city')
            ->pluck('city');
    }
}
