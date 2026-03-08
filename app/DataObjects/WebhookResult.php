<?php

namespace App\DataObjects;

class WebhookResult
{
	/**
	 * @param array<string, mixed> $payload
	 */
	public function __construct(
		public readonly bool $isValid,
		public readonly ?string $eventType = null,
		public readonly ?string $providerTransactionId = null,
		public readonly ?string $status = null,
		public readonly array $payload = [],
	) {}
}

