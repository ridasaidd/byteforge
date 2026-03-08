<?php

namespace App\DataObjects;

class PaymentData
{
	/**
	 * @param array<string, mixed> $metadata
	 */
	public function __construct(
		public readonly int $amount,
		public readonly string $currency,
		public readonly ?string $description = null,
		public readonly ?string $customerEmail = null,
		public readonly ?string $customerName = null,
		public readonly array $metadata = [],
	) {}
}

