<?php

namespace App\Http\Controllers\Api;

use App\Actions\Api\Tenant\CreateNavigationAction;
use App\Actions\Api\Tenant\DeleteNavigationAction;
use App\Actions\Api\Tenant\ListNavigationsAction;
use App\Actions\Api\Tenant\UpdateNavigationAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Tenant\CreateNavigationRequest;
use App\Http\Requests\Api\Tenant\UpdateNavigationRequest;
use App\Models\Navigation;
use Illuminate\Http\Request;

class NavigationController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $filters = $request->only(['status']);
        $result = app(ListNavigationsAction::class)->execute($filters);

        return response()->json($result);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(CreateNavigationRequest $request)
    {
        $navigation = app(CreateNavigationAction::class)->execute(
            $request->validated(),
            $request->user()
        );

        return response()->json([
            'message' => 'Navigation created successfully',
            'data' => $navigation,
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $navigation = Navigation::where('tenant_id', tenancy()->tenant->id)
            ->findOrFail($id);

        return response()->json([
            'data' => $navigation,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateNavigationRequest $request, string $id)
    {
        $navigation = Navigation::where('tenant_id', tenancy()->tenant->id)
            ->findOrFail($id);

        $updatedNavigation = app(UpdateNavigationAction::class)->execute(
            $navigation,
            $request->validated()
        );

        return response()->json([
            'message' => 'Navigation updated successfully',
            'data' => $updatedNavigation,
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $navigation = Navigation::where('tenant_id', tenancy()->tenant->id)
            ->findOrFail($id);

        app(DeleteNavigationAction::class)->execute($navigation);

        return response()->json([
            'message' => 'Navigation deleted successfully',
        ]);
    }
}
