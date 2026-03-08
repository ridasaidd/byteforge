<?php

namespace App\DataObjects;

class PaymentStatus
{
	/**
	 * @param array<string, mixed>|null $providerData
	 */
	public function __construct(
		public readonly string $status,
		public readonly ?array $providerData = null,
	) {}
}

