<?php

namespace App\DataObjects;

class PaymentResult
{
	/**
	 * @param array<string, mixed>|null $rawResponse
	 */
	public function __construct(
		public readonly bool $success,
		public readonly ?string $providerTransactionId = null,
		public readonly ?string $clientSecret = null,
		public readonly ?string $redirectUrl = null,
		public readonly ?string $errorMessage = null,
		public readonly ?array $rawResponse = null,
	) {}
}

