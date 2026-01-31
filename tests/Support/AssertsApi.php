<?php

namespace Tests\Support;

use Illuminate\Testing\TestResponse;

/**
 * API assertion helpers for testing API endpoints.
 *
 * Provides fluent assertions for common API response patterns.
 *
 * Usage:
 *   $response = $this->actingAsSuperadmin()->getJson('/api/pages');
 *   $this->assertPaginatedResponse($response);
 *   $this->assertJsonApiError($response, 'title', 'The title field is required.');
 */
trait AssertsApi
{
    // =========================================================================
    // RESPONSE STRUCTURE ASSERTIONS
    // =========================================================================

    /**
     * Assert the response is a paginated list.
     */
    protected function assertPaginatedResponse(TestResponse $response, int $expectedStatus = 200): static
    {
        $response->assertStatus($expectedStatus)
            ->assertJsonStructure([
                'data',
                'meta' => [
                    'current_page',
                    'last_page',
                    'per_page',
                    'total',
                ],
            ]);

        return $this;
    }

    /**
     * Assert the response is a single resource.
     */
    protected function assertResourceResponse(TestResponse $response, int $expectedStatus = 200): static
    {
        $response->assertStatus($expectedStatus)
            ->assertJsonStructure([
                'data' => ['id'],
            ]);

        return $this;
    }

    /**
     * Assert the response is a successful creation.
     */
    protected function assertCreatedResponse(TestResponse $response): static
    {
        $response->assertStatus(201)
            ->assertJsonStructure([
                'data' => ['id'],
            ]);

        return $this;
    }

    /**
     * Assert the response is a successful deletion.
     */
    protected function assertDeletedResponse(TestResponse $response): static
    {
        $response->assertStatus(200)
            ->assertJsonStructure(['message']);

        return $this;
    }

    // =========================================================================
    // ERROR ASSERTIONS
    // =========================================================================

    /**
     * Assert the response is a validation error.
     */
    protected function assertValidationError(TestResponse $response, string $field): static
    {
        $response->assertStatus(422)
            ->assertJsonValidationErrors([$field]);

        return $this;
    }

    /**
     * Assert the response is an unauthorized error (401).
     */
    protected function assertUnauthorizedResponse(TestResponse $response): static
    {
        $response->assertStatus(401);

        return $this;
    }

    /**
     * Assert the response is a forbidden error (403).
     */
    protected function assertForbiddenResponse(TestResponse $response): static
    {
        $response->assertStatus(403);

        return $this;
    }

    /**
     * Assert the response is a not found error (404).
     */
    protected function assertNotFoundResponse(TestResponse $response): static
    {
        $response->assertStatus(404);

        return $this;
    }

    // =========================================================================
    // PERMISSION ASSERTIONS
    // =========================================================================

    /**
     * Assert that a user CAN access an endpoint.
     *
     * @param string $method HTTP method (GET, POST, PUT, DELETE)
     * @param string $uri Endpoint URI
     * @param array $data Request data (for POST/PUT)
     */
    protected function assertUserCanAccess(string $method, string $uri, array $data = []): static
    {
        $response = match (strtoupper($method)) {
            'GET' => $this->getJson($uri),
            'POST' => $this->postJson($uri, $data),
            'PUT', 'PATCH' => $this->putJson($uri, $data),
            'DELETE' => $this->deleteJson($uri),
            default => throw new \InvalidArgumentException("Unknown HTTP method: {$method}"),
        };

        $this->assertNotIn($response->status(), [401, 403], "User should be able to access {$method} {$uri}");

        return $this;
    }

    /**
     * Assert that a user CANNOT access an endpoint (403 Forbidden).
     *
     * @param string $method HTTP method
     * @param string $uri Endpoint URI
     * @param array $data Request data (for POST/PUT)
     */
    protected function assertUserCannotAccess(string $method, string $uri, array $data = []): static
    {
        $response = match (strtoupper($method)) {
            'GET' => $this->getJson($uri),
            'POST' => $this->postJson($uri, $data),
            'PUT', 'PATCH' => $this->putJson($uri, $data),
            'DELETE' => $this->deleteJson($uri),
            default => throw new \InvalidArgumentException("Unknown HTTP method: {$method}"),
        };

        $response->assertStatus(403);

        return $this;
    }

    /**
     * Assert that unauthenticated users cannot access an endpoint (401).
     *
     * @param string $method HTTP method
     * @param string $uri Endpoint URI
     */
    protected function assertRequiresAuthentication(string $method, string $uri): static
    {
        $response = match (strtoupper($method)) {
            'GET' => $this->getJson($uri),
            'POST' => $this->postJson($uri, []),
            'PUT', 'PATCH' => $this->putJson($uri, []),
            'DELETE' => $this->deleteJson($uri),
            default => throw new \InvalidArgumentException("Unknown HTTP method: {$method}"),
        };

        $response->assertStatus(401);

        return $this;
    }

    // =========================================================================
    // DATA ASSERTIONS
    // =========================================================================

    /**
     * Assert response contains a specific number of items.
     */
    protected function assertJsonCount(TestResponse $response, int $count, string $key = 'data'): static
    {
        $response->assertJsonCount($count, $key);

        return $this;
    }

    /**
     * Assert response data contains specific values.
     */
    protected function assertJsonDataContains(TestResponse $response, array $expected): static
    {
        $response->assertJsonFragment($expected);

        return $this;
    }
}
