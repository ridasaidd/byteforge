<?php

namespace App\Http\Controllers\Api;

use App\DataObjects\PaymentData;
use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Models\Tenant;
use App\Models\TenantPaymentProvider;
use App\Models\AnalyticsEvent;
use App\Services\BillingService;
use App\Services\AnalyticsService;
use App\Services\PaymentService;
use App\Services\RefundService;
use App\Services\Gateways\KlarnaGateway;
use App\Services\Gateways\StripeGateway;
use App\Services\Gateways\SwishGateway;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class PaymentController extends Controller
{
    public function __construct(
        private readonly BillingService $billingService,
        private readonly AnalyticsService $analyticsService,
        private readonly PaymentService $paymentService,
        private readonly RefundService $refundService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $tenant = $this->resolveCurrentTenant();

        $filters = Validator::make($request->all(), [
            'status' => ['sometimes', 'string'],
            'provider' => ['sometimes', 'string', 'in:stripe,swish,klarna'],
            'from' => ['sometimes', 'date'],
            'to' => ['sometimes', 'date'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ])->validate();

        $perPage = (int) ($filters['per_page'] ?? 15);
        $paginator = $this->paymentService->listPayments((string) $tenant->id, $filters, $perPage);

        return response()->json([
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    public function show(string $payment): JsonResponse
    {
        $tenant = $this->resolveCurrentTenant();
        $row = $this->paymentService->getPaymentForTenant((string) $tenant->id, (int) $payment);

        return response()->json([
            'data' => $row,
        ]);
    }

    public function refund(Request $request, string $payment): JsonResponse
    {
        $tenant = $this->resolveCurrentTenant();

        $validated = Validator::make($request->all(), [
            'amount' => ['required', 'integer', 'min:1'],
            'reason' => ['nullable', 'string', 'max:255'],
        ])->validate();

        $row = $this->paymentService->getPaymentForTenant((string) $tenant->id, (int) $payment);
        $refund = $this->refundService->processRefund($row, (int) $validated['amount'], $validated['reason'] ?? null);

        return response()->json([
            'data' => $refund,
        ]);
    }

    public function createStripeIntent(Request $request): JsonResponse
    {
        $validated = Validator::make($request->all(), [
            'amount' => ['required', 'integer', 'min:1'],
            'currency' => ['required', 'string', 'size:3'],
            'description' => ['nullable', 'string', 'max:255'],
            'customer_email' => ['nullable', 'email'],
            'customer_name' => ['nullable', 'string', 'max:255'],
            'metadata' => ['sometimes', 'array', 'max:20'],
            'metadata.*' => ['max:255'],
        ])->validate();

        $tenant = $this->resolveCurrentTenant();

        if (!$this->billingService->hasAddon($tenant, 'payments')) {
            throw ValidationException::withMessages([
                'addon' => 'Payment Processing add-on is required before creating payment intents.',
            ]);
        }

        $provider = TenantPaymentProvider::query()
            ->forTenant((string) $tenant->id)
            ->where('provider', 'stripe')
            ->active()
            ->firstOrFail();

        $metadata = (array) ($validated['metadata'] ?? []);
        $metadata['tenant_id'] = (string) $tenant->id;

        $gateway = new StripeGateway((array) $provider->credentials);
        $result = $gateway->createPayment(new PaymentData(
            amount: (int) $validated['amount'],
            currency: strtoupper((string) $validated['currency']),
            description: $validated['description'] ?? null,
            customerEmail: $validated['customer_email'] ?? null,
            customerName: $validated['customer_name'] ?? null,
            metadata: $metadata,
        ));

        $payment = Payment::query()->create([
            'tenant_id' => (string) $tenant->id,
            'provider' => 'stripe',
            'provider_transaction_id' => $result->providerTransactionId,
            'status' => Payment::STATUS_PENDING,
            'amount' => (int) $validated['amount'],
            'currency' => strtoupper((string) $validated['currency']),
            'customer_email' => $validated['customer_email'] ?? null,
            'customer_name' => $validated['customer_name'] ?? null,
            'metadata' => $metadata,
            'provider_response' => $result->rawResponse,
        ]);

        return response()->json([
            'payment_id' => $payment->id,
            'client_secret' => $result->clientSecret,
            'provider_transaction_id' => $result->providerTransactionId,
        ]);
    }

    public function createSwishPayment(Request $request): JsonResponse
    {
        $validated = Validator::make($request->all(), [
            'amount' => ['required', 'integer', 'min:1'],
            'currency' => ['required', 'string', 'size:3'],
            'payer_alias' => ['required', 'string', 'regex:/^\d{10,12}$/'],
            'message' => ['nullable', 'string', 'max:50'],
            'metadata' => ['sometimes', 'array', 'max:20'],
            'metadata.*' => ['max:255'],
        ])->validate();

        $tenant = $this->resolveCurrentTenant();

        if (!$this->billingService->hasAddon($tenant, 'payments')) {
            throw ValidationException::withMessages([
                'addon' => 'Payment Processing add-on is required before creating payments.',
            ]);
        }

        $provider = TenantPaymentProvider::query()
            ->forTenant((string) $tenant->id)
            ->where('provider', 'swish')
            ->active()
            ->firstOrFail();

        $metadata = (array) ($validated['metadata'] ?? []);
        $metadata['tenant_id'] = (string) $tenant->id;
        $metadata['payer_alias'] = (string) $validated['payer_alias'];

        $gateway = new SwishGateway((array) $provider->credentials);
        $result = $gateway->createPayment(new PaymentData(
            amount: (int) $validated['amount'],
            currency: strtoupper((string) $validated['currency']),
            description: $validated['message'] ?? 'Swish payment',
            metadata: $metadata,
        ));

        if (!$result->success) {
            throw ValidationException::withMessages([
                'payment' => $result->errorMessage ?? 'Failed to create Swish payment.',
            ]);
        }

        $payment = Payment::query()->create([
            'tenant_id' => (string) $tenant->id,
            'provider' => 'swish',
            'provider_transaction_id' => $result->providerTransactionId,
            'status' => Payment::STATUS_PENDING,
            'amount' => (int) $validated['amount'],
            'currency' => strtoupper((string) $validated['currency']),
            'metadata' => $metadata,
            'provider_response' => $result->rawResponse,
        ]);

        return response()->json([
            'payment_id' => $payment->id,
            'provider_transaction_id' => $result->providerTransactionId,
            'payment_request_token' => (string) data_get($result->rawResponse, 'paymentRequestToken', ''),
            'redirect_url' => $result->redirectUrl,
        ]);
    }

    public function swishStatus(Request $request, string $id): JsonResponse
    {
        if (!preg_match('/^[A-Fa-f0-9\-]{36}$/', $id)) {
            abort(404);
        }

        $tenant = $this->resolveCurrentTenant();

        if (!$this->billingService->hasAddon($tenant, 'payments')) {
            throw ValidationException::withMessages([
                'addon' => 'Payment Processing add-on is required before viewing payment status.',
            ]);
        }

        $provider = TenantPaymentProvider::query()
            ->forTenant((string) $tenant->id)
            ->where('provider', 'swish')
            ->active()
            ->firstOrFail();

        $gateway = new SwishGateway((array) $provider->credentials);
        $status = $gateway->getPaymentStatus($id);

        return response()->json([
            'data' => [
                'provider_transaction_id' => $id,
                'status' => $status->status,
                'provider_data' => $status->providerData,
            ],
        ]);
    }

    public function createKlarnaSession(Request $request): JsonResponse
    {
        $validated = Validator::make($request->all(), [
            'amount' => ['required', 'integer', 'min:1'],
            'currency' => ['required', 'string', 'size:3'],
            'locale' => ['required', 'string', 'max:10'],
            'order_lines' => ['required', 'array', 'min:1'],
            'order_lines.*.name' => ['required', 'string'],
            'order_lines.*.quantity' => ['required', 'integer', 'min:1'],
            'order_lines.*.unit_price' => ['required', 'integer', 'min:1'],
            'order_lines.*.tax_rate' => ['required', 'integer', 'min:0'],
            'metadata' => ['sometimes', 'array', 'max:20'],
            'metadata.*' => ['max:255'],
        ])->validate();

        $tenant = $this->resolveCurrentTenant();
        $provider = $this->resolveProviderForTenant($tenant, 'klarna');

        $metadata = (array) ($validated['metadata'] ?? []);
        $metadata['tenant_id'] = (string) $tenant->id;
        $metadata['locale'] = (string) $validated['locale'];
        $metadata['order_lines'] = (array) $validated['order_lines'];

        $gateway = new KlarnaGateway((array) $provider->credentials);
        $result = $gateway->createPayment(new PaymentData(
            amount: (int) $validated['amount'],
            currency: strtoupper((string) $validated['currency']),
            description: 'Klarna payment session',
            metadata: $metadata,
        ));

        $payment = Payment::query()->create([
            'tenant_id' => (string) $tenant->id,
            'provider' => 'klarna',
            'provider_transaction_id' => $result->providerTransactionId,
            'status' => Payment::STATUS_PENDING,
            'amount' => (int) $validated['amount'],
            'currency' => strtoupper((string) $validated['currency']),
            'metadata' => $metadata,
            'provider_response' => $result->rawResponse,
        ]);

        return response()->json([
            'payment_id' => $payment->id,
            'session_id' => $result->providerTransactionId,
            'client_token' => $result->clientSecret,
        ]);
    }

    public function authorizeKlarna(Request $request): JsonResponse
    {
        $validated = Validator::make($request->all(), [
            'payment_id' => ['required', 'integer', 'exists:payments,id'],
            'authorization_token' => ['required', 'string', 'max:255', 'regex:/^[A-Za-z0-9_\-]+$/'],
        ])->validate();

        $tenant = $this->resolveCurrentTenant();
        $provider = $this->resolveProviderForTenant($tenant, 'klarna');

        $payment = Payment::query()
            ->forTenant((string) $tenant->id)
            ->where('provider', 'klarna')
            ->findOrFail((int) $validated['payment_id']);

        $gateway = new KlarnaGateway((array) $provider->credentials);
        $authResult = $gateway->authorize((string) $validated['authorization_token'], [
            'purchase_country' => 'SE',
            'purchase_currency' => $payment->currency,
            'locale' => (string) data_get($payment->metadata, 'locale', 'sv-SE'),
            'order_amount' => (int) $payment->amount,
            'order_tax_amount' => 0,
            'order_lines' => (array) data_get($payment->metadata, 'order_lines', []),
        ]);

        $metadata = (array) ($payment->metadata ?? []);
        $metadata['klarna_order_id'] = (string) ($authResult['order_id'] ?? '');

        $payment->update([
            'status' => Payment::STATUS_PROCESSING,
            'metadata' => $metadata,
            'provider_response' => $authResult,
        ]);

        return response()->json([
            'data' => [
                'payment_id' => $payment->id,
                'order_id' => (string) ($authResult['order_id'] ?? ''),
                'status' => Payment::STATUS_PROCESSING,
            ],
        ]);
    }

    public function captureKlarna(Request $request, string $id): JsonResponse
    {
        $validated = Validator::make($request->all(), [
            'amount' => ['sometimes', 'integer', 'min:1'],
        ])->validate();

        $tenant = $this->resolveCurrentTenant();
        $provider = $this->resolveProviderForTenant($tenant, 'klarna');

        $payment = Payment::query()
            ->forTenant((string) $tenant->id)
            ->where('provider', 'klarna')
            ->findOrFail((int) $id);

        $orderId = (string) data_get($payment->metadata, 'klarna_order_id', '');
        if ($orderId === '') {
            throw ValidationException::withMessages([
                'order_id' => 'Klarna order ID missing. Authorize payment before capture.',
            ]);
        }

        $gateway = new KlarnaGateway((array) $provider->credentials);
        $captureAmount = isset($validated['amount']) ? (int) $validated['amount'] : (int) $payment->amount;
        $captureResult = $gateway->capture($orderId, $captureAmount);

        $payment->update([
            'status' => Payment::STATUS_COMPLETED,
            'paid_at' => now(),
            'provider_response' => $captureResult,
        ]);

        $this->analyticsService->record(
            AnalyticsEvent::TYPE_PAYMENT_CAPTURED,
            [
                'payment_id' => $payment->id,
                'provider' => 'klarna',
                'amount' => $captureAmount,
                'currency' => $payment->currency,
            ],
            tenantId: (string) $tenant->id,
            subject: $payment,
        );

        return response()->json([
            'data' => [
                'payment_id' => $payment->id,
                'status' => Payment::STATUS_COMPLETED,
                'capture_id' => (string) ($captureResult['capture_id'] ?? ''),
            ],
        ]);
    }

    private function resolveProviderForTenant(Tenant $tenant, string $provider): TenantPaymentProvider
    {
        if (!$this->billingService->hasAddon($tenant, 'payments')) {
            throw ValidationException::withMessages([
                'addon' => 'Payment Processing add-on is required before creating payments.',
            ]);
        }

        return TenantPaymentProvider::query()
            ->forTenant((string) $tenant->id)
            ->where('provider', $provider)
            ->active()
            ->firstOrFail();
    }

    private function resolveCurrentTenant(): Tenant
    {
        $tenantId = (string) (tenant('id') ?? '');
        if ($tenantId === '') {
            abort(404);
        }

        return Tenant::query()->findOrFail($tenantId);
    }
}
