<?php

namespace App\DataObjects;

class RefundResult
{
	/**
	 * @param array<string, mixed>|null $rawResponse
	 */
	public function __construct(
		public readonly bool $success,
		public readonly ?string $providerRefundId = null,
		public readonly ?string $errorMessage = null,
		public readonly ?array $rawResponse = null,
	) {}
}

