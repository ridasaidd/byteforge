<?php

namespace App\Contracts;

use App\DataObjects\PaymentData;
use App\DataObjects\PaymentResult;
use App\DataObjects\PaymentStatus;
use App\DataObjects\RefundResult;
use App\DataObjects\WebhookResult;
use Illuminate\Http\Request;

interface PaymentGatewayContract
{
	public function createPayment(PaymentData $data): PaymentResult;

	public function getPaymentStatus(string $providerTransactionId): PaymentStatus;

	public function refund(string $providerTransactionId, int $amount, ?string $reason = null): RefundResult;

	public function handleWebhook(Request $request): WebhookResult;

	/**
	 * @param array<string, mixed> $credentials
	 */
	public function validateCredentials(array $credentials): bool;

	/**
	 * @return list<string>
	 */
	public function getRequiredCredentialFields(): array;

	public function getProviderName(): string;
}

