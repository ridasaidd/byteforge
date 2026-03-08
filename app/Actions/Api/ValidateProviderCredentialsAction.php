<?php

namespace App\Actions\Api;

use Lorisleiva\Actions\Concerns\AsAction;

class ValidateProviderCredentialsAction
{
    use AsAction;

    /**
     * @param array<string, mixed> $credentials
     * @return array{valid: bool, errors: array<string, string>}
     */
    public function handle(string $provider, array $credentials): array
    {
        return match (strtolower($provider)) {
            'stripe' => $this->validateStripe($credentials),
            'swish' => $this->validateSwish($credentials),
            'klarna' => $this->validateKlarna($credentials),
            default => [
                'valid' => false,
                'errors' => ['provider' => 'Unsupported payment provider.'],
            ],
        };
    }

    /**
     * @param array<string, mixed> $credentials
     * @return array{valid: bool, errors: array<string, string>}
     */
    private function validateStripe(array $credentials): array
    {
        $errors = [];

        $publishable = (string) ($credentials['publishable_key'] ?? '');
        if (!preg_match('/^pk_(test|live)_[A-Za-z0-9_]+$/', $publishable)) {
            $errors['publishable_key'] = 'Stripe publishable_key must start with pk_test_ or pk_live_.';
        }

        $secret = (string) ($credentials['secret_key'] ?? '');
        if (!preg_match('/^sk_(test|live)_[A-Za-z0-9_]+$/', $secret)) {
            $errors['secret_key'] = 'Stripe secret_key must start with sk_test_ or sk_live_.';
        }

        return [
            'valid' => empty($errors),
            'errors' => $errors,
        ];
    }

    /**
     * @param array<string, mixed> $credentials
     * @return array{valid: bool, errors: array<string, string>}
     */
    private function validateSwish(array $credentials): array
    {
        $errors = [];

        $merchantNumber = (string) ($credentials['merchant_swish_number'] ?? '');
        if (!preg_match('/^123\d{7}$/', $merchantNumber)) {
            $errors['merchant_swish_number'] = 'Swish merchant number must be 10 digits and start with 123.';
        }

        foreach (['certificate', 'private_key', 'ca_certificate'] as $field) {
            $value = (string) ($credentials[$field] ?? '');
            if (trim($value) === '') {
                $errors[$field] = sprintf('Swish %s is required.', $field);
            }
        }

        return [
            'valid' => empty($errors),
            'errors' => $errors,
        ];
    }

    /**
     * @param array<string, mixed> $credentials
     * @return array{valid: bool, errors: array<string, string>}
     */
    private function validateKlarna(array $credentials): array
    {
        $errors = [];

        $username = (string) ($credentials['username'] ?? '');
        if (!preg_match('/^PK_[A-Za-z0-9_]+$/', $username)) {
            $errors['username'] = 'Klarna username must start with PK_.';
        }

        $password = (string) ($credentials['password'] ?? '');
        if (trim($password) === '') {
            $errors['password'] = 'Klarna password is required.';
        }

        return [
            'valid' => empty($errors),
            'errors' => $errors,
        ];
    }
}
