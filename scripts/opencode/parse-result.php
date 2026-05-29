<?php

declare(strict_types=1);

require __DIR__ . '/../../vendor/autoload.php';

use Symfony\Component\Yaml\Exception\ParseException;
use Symfony\Component\Yaml\Yaml;

function parseArgs(array $argv): array
{
    $args = [];

    for ($i = 1; $i < count($argv); $i++) {
        $token = $argv[$i];
        if (!str_starts_with($token, '--')) {
            continue;
        }

        $key = substr($token, 2);
        $next = $argv[$i + 1] ?? null;

        if ($next === null || str_starts_with($next, '--')) {
            $args[$key] = true;
            continue;
        }

        $args[$key] = $next;
        $i++;
    }

    return $args;
}

function outputResult(array $result, bool $asJson): void
{
    if ($asJson) {
        echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
        return;
    }

    echo $result['status'] . PHP_EOL;
}

function findLatestArtifactPath(string $root): ?string
{
    $dir = $root . '/storage/opencode-runs';
    if (!is_dir($dir)) {
        return null;
    }

    $pointerFile = $dir . '/.latest';
    if (is_file($pointerFile)) {
        $ref = trim((string) file_get_contents($pointerFile));
        if ($ref !== '' && is_file($ref)) {
            return $ref;
        }
    }

    $files = glob($dir . '/*.json') ?: [];
    if (count($files) === 0) {
        return null;
    }

    usort($files, static function (string $a, string $b): int {
        return filemtime($b) <=> filemtime($a);
    });

    return $files[0] ?? null;
}

function normalizeScalar(mixed $value): ?string
{
    if ($value === null) {
        return null;
    }

    if (is_bool($value)) {
        return $value ? 'true' : 'false';
    }

    if (is_scalar($value)) {
        return trim((string) $value);
    }

    return null;
}

function validateSchema(string $assistantText): array
{
    $issues = [];
    $data = null;

    try {
        $parsed = Yaml::parse($assistantText);
        if (!is_array($parsed)) {
            $issues[] = 'yaml root must be a map';
        } else {
            $data = $parsed;
        }
    } catch (ParseException $e) {
        $issues[] = 'invalid yaml syntax';
    }

    if ($data === null) {
        return [
            'valid' => false,
            'issues' => $issues,
            'status' => null,
            'failureType' => null,
            'taskRef' => null,
        ];
    }

    $schemaVersion = normalizeScalar($data['schema_version'] ?? null);
    if ($schemaVersion === null || $schemaVersion === '') {
        $issues[] = 'missing schema_version';
    } elseif ($schemaVersion !== '1') {
        $issues[] = 'schema_version must be 1';
    }

    $status = normalizeScalar($data['status'] ?? null);
    if ($status === null || $status === '') {
        $issues[] = 'missing status';
    } elseif ($status !== 'success' && $status !== 'failed') {
        $issues[] = 'status must be success or failed';
    }

    $taskRef = $data['task_ref'] ?? null;
    if (!is_array($taskRef)) {
        $issues[] = 'missing task_ref map';
        $taskRef = null;
    } else {
        if (normalizeScalar($taskRef['packet_id'] ?? null) === null) {
            $issues[] = 'missing task_ref.packet_id';
        }

        if (normalizeScalar($taskRef['phase'] ?? null) === null) {
            $issues[] = 'missing task_ref.phase';
        }

        if (normalizeScalar($taskRef['attempt'] ?? null) === null) {
            $issues[] = 'missing task_ref.attempt';
        }

        if (normalizeScalar($taskRef['executor_model'] ?? null) === null) {
            $issues[] = 'missing task_ref.executor_model';
        }
    }

    $allowedFailureTypes = [
        'requirement_mismatch',
        'test_failure',
        'environment_blocker',
        'ambiguity_in_spec',
        'unsafe_change_risk',
        'dependency_gap',
    ];

    $failureType = null;
    if ($status === 'failed') {
        $failureType = normalizeScalar($data['failure_type'] ?? null);
        if ($failureType === null || $failureType === '') {
            $issues[] = 'missing failure_type for failed status';
        } elseif (!in_array($failureType, $allowedFailureTypes, true)) {
            $issues[] = 'failure_type is not in allowed set';
        }
    }

    return [
        'valid' => count($issues) === 0,
        'issues' => $issues,
        'status' => $status,
        'failureType' => $failureType,
        'taskRef' => $taskRef,
    ];
}

$args = parseArgs($argv);
if (($args['help'] ?? false) || ($args['h'] ?? false)) {
    fwrite(STDERR, "Usage:\n  php scripts/opencode/parse-result.php [--artifact <path>] [--json]\n\nOutput:\n  success\n  failed:<failure_type>\n  failed:invalid_schema\n");
    exit(0);
}

$root = realpath(__DIR__ . '/../../');
if ($root === false) {
    fwrite(STDERR, "Unable to resolve project root\n");
    exit(1);
}

$artifactPath = null;
if (isset($args['artifact']) && is_string($args['artifact']) && $args['artifact'] !== '') {
    $artifactPath = $args['artifact'];
    if (!str_starts_with($artifactPath, '/')) {
        $artifactPath = $root . '/' . $artifactPath;
    }
} else {
    $artifactPath = findLatestArtifactPath($root);
}

if ($artifactPath === null || !is_file($artifactPath)) {
    fwrite(STDERR, "No artifacts found in storage/opencode-runs\n");
    exit(1);
}

$artifactRaw = file_get_contents($artifactPath);
if ($artifactRaw === false) {
    fwrite(STDERR, "Unable to read artifact JSON\n");
    exit(1);
}

$artifact = json_decode($artifactRaw, true);
if (!is_array($artifact)) {
    fwrite(STDERR, "Unable to parse artifact JSON\n");
    exit(1);
}

$assistantText = (string) ($artifact['assistantText'] ?? '');
$validation = validateSchema($assistantText);

$asJson = (bool) ($args['json'] ?? false);

if (!$validation['valid']) {
    outputResult([
        'status' => 'failed:invalid_schema',
        'artifactPath' => $artifactPath,
        'issues' => $validation['issues'],
        'taskRef' => $validation['taskRef'],
    ], $asJson);
    exit(0);
}

if ($validation['status'] === 'success') {
    outputResult([
        'status' => 'success',
        'artifactPath' => $artifactPath,
        'taskRef' => $validation['taskRef'],
    ], $asJson);
    exit(0);
}

outputResult([
    'status' => 'failed:' . $validation['failureType'],
    'artifactPath' => $artifactPath,
    'taskRef' => $validation['taskRef'],
], $asJson);
