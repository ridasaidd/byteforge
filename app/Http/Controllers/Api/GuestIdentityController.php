<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Actions\Api\NormalizeInputFieldsAction;
use App\Http\Controllers\Controller;
use App\Services\Guest\GuestMagicLinkService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class GuestIdentityController extends Controller
{
    public function __construct(
        private readonly GuestMagicLinkService $guestMagicLinkService,
        private readonly NormalizeInputFieldsAction $normalizeInputFields,
    ) {}

    public function issueMagicLink(Request $request): JsonResponse
    {
        $validated = Validator::make(($this->normalizeInputFields)(
            $request->all(),
            singleLineFields: ['email'],
        ), [
            'email' => ['required', 'email'],
            'tenant_id' => ['required', 'string', 'exists:tenants,id'],
            'redirect_url' => ['required', 'url'],
        ])->validate();

        $result = $this->guestMagicLinkService->issue(
            $validated['email'],
            $validated['tenant_id'],
            $validated['redirect_url'],
        );

        return response()->json([
            'sent' => true,
            'data' => [
                'guest_user_id' => $result['guestUser']->id,
                'email' => $result['guestUser']->email,
            ],
        ]);
    }

    public function verifyMagicToken(Request $request): JsonResponse
    {
        $validated = Validator::make($request->all(), [
            'token' => ['required', 'string'],
            'tenant_id' => ['required', 'string', 'exists:tenants,id'],
        ])->validate();

        $guestUser = $this->guestMagicLinkService->verify(
            $validated['token'],
            $validated['tenant_id'],
        );

        return response()->json([
            'data' => [
                'guest_user_id' => $guestUser->id,
                'email' => $guestUser->email,
                'name' => $guestUser->name,
            ],
        ]);
    }
}
