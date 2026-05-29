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

function usage(): void
{
    fwrite(STDERR, "Usage:\n  php scripts/opencode/dispatch.php --packet <file> [--format json|shell]\n");
}

function dbPath(string $root): string
{
    $custom = getenv('OPENCODE_STATE_DB');
    if (is_string($custom) && trim($custom) !== '') {
        return $custom;
    }

    return $root . '/storage/opencode-state.sqlite';
}

function normalizeScalar(mixed $value, string $fallback): string
{
    if (is_string($value)) {
        $trimmed = trim($value);
        return $trimmed === '' ? $fallback : $trimmed;
    }

    if (is_numeric($value)) {
        return (string) $value;
    }

    return $fallback;
}

function boolValue(mixed $value, bool $fallback = false): bool
{
    if (is_bool($value)) {
        return $value;
    }

    if (is_string($value)) {
        $normalized = strtolower(trim($value));
        if (in_array($normalized, ['1', 'true', 'yes', 'on'], true)) {
            return true;
        }
        if (in_array($normalized, ['0', 'false', 'no', 'off'], true)) {
            return false;
        }
    }

    return $fallback;
}

function chooseProfile(string $taskClass, string $riskLevel): string
{
    $highRiskClasses = ['critical', 'security', 'payments', 'tenancy', 'auth'];
    $cheapClasses = ['docs', 'minor', 'meta', 'chore'];

    if ($riskLevel === 'high' || in_array($taskClass, $highRiskClasses, true)) {
        return 'high';
    }

    if ($riskLevel === 'low' && in_array($taskClass, $cheapClasses, true)) {
        return 'cheap';
    }

    return 'medium';
}

function fetchRoutingOverride(string $root, string $taskClass, string $riskLevel): ?array
{
    $path = dbPath($root);
    if (!is_file($path)) {
        return null;
    }

    try {
        $pdo = new PDO('sqlite:' . $path);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

        $stmt = $pdo->prepare(<<<SQL
SELECT task_class, risk_level, provider, model, variant, priority, enabled
FROM task_routing
WHERE enabled = 1
  AND task_class IN (:task_class, '*')
  AND risk_level IN (:risk_level, '*')
ORDER BY
  CASE WHEN task_class = :task_class_exact THEN 0 ELSE 1 END,
  CASE WHEN risk_level = :risk_level_exact THEN 0 ELSE 1 END,
  priority ASC,
  id ASC
LIMIT 1;
SQL
        );
        $stmt->execute([
            ':task_class' => $taskClass,
            ':risk_level' => $riskLevel,
            ':task_class_exact' => $taskClass,
            ':risk_level_exact' => $riskLevel,
        ]);

        $row = $stmt->fetch();
        return is_array($row) ? $row : null;
    } catch (Throwable) {
        return null;
    }
}

function buildDecision(array $packet, string $root): array
{
    $policy = is_array($packet['execution_policy'] ?? null)
        ? $packet['execution_policy']
        : [];

    $taskClass = strtolower(normalizeScalar($policy['task_class'] ?? null, 'feature'));
    $riskLevel = strtolower(normalizeScalar($policy['risk_level'] ?? null, 'medium'));

    $route = $taskClass === 'git_plumbing' ? 'local_git' : 'executor';
    $profile = chooseProfile($taskClass, $riskLevel);

    $providerCheap = getenv('OPENCODE_MODEL_CHEAP_PROVIDER') ?: 'opencode-go';
    $providerMedium = getenv('OPENCODE_MODEL_MEDIUM_PROVIDER') ?: 'opencode-go';
    $providerHigh = getenv('OPENCODE_MODEL_HIGH_PROVIDER') ?: 'opencode-go';

    $modelCheap = getenv('OPENCODE_MODEL_CHEAP') ?: 'deepseek-v4-flash';
    $modelMedium = getenv('OPENCODE_MODEL_MEDIUM') ?: 'deepseek-v4-pro-medium';
    $modelHigh = getenv('OPENCODE_MODEL_HIGH') ?: 'deepseek-v4-pro-high';

    $provider = $providerMedium;
    $model = $modelMedium;
    $variant = $profile;

    $routeOverride = fetchRoutingOverride($root, $taskClass, $riskLevel);
    $routeSource = 'heuristic';

    if (is_array($routeOverride)) {
        $provider = normalizeScalar($routeOverride['provider'] ?? null, $provider);
        $model = normalizeScalar($routeOverride['model'] ?? null, $model);
        $variant = normalizeScalar($routeOverride['variant'] ?? null, $profile);
        $routeSource = 'task_routing';
    }

    if ($routeSource !== 'task_routing') {
        if ($profile === 'cheap') {
            $provider = $providerCheap;
            $model = $modelCheap;
        } elseif ($profile === 'high') {
            $provider = $providerHigh;
            $model = $modelHigh;
        }
    }

    return [
        'packet_id' => normalizeScalar($packet['task_ref']['packet_id'] ?? null, 'packet'),
        'route' => $route,
        'task_class' => $taskClass,
        'risk_level' => $riskLevel,
        'profile' => $profile,
        'variant' => $variant,
        'route_source' => $routeSource,
        'provider' => $provider,
        'model' => $model,
        'finalize_git' => boolValue($policy['finalize_git'] ?? null, false),
    ];
}

$args = parseArgs($argv);
if (!isset($args['packet']) || !is_string($args['packet']) || trim($args['packet']) === '') {
    usage();
    exit(1);
}

$format = strtolower((string) ($args['format'] ?? 'json'));
if ($format !== 'json' && $format !== 'shell') {
    fwrite(STDERR, "Invalid --format value. Use json or shell.\n");
    exit(1);
}

$root = realpath(__DIR__ . '/../../');
if ($root === false) {
    fwrite(STDERR, "Unable to resolve project root\n");
    exit(1);
}

$packetPath = (string) $args['packet'];
if (!str_starts_with($packetPath, '/')) {
    $packetPath = $root . '/' . $packetPath;
}

if (!is_file($packetPath)) {
    fwrite(STDERR, "Packet not found: {$packetPath}\n");
    exit(1);
}

try {
    $packet = Yaml::parseFile($packetPath);
} catch (ParseException $e) {
    fwrite(STDERR, "Packet YAML parse error: {$e->getMessage()}\n");
    exit(1);
}

if (!is_array($packet)) {
    fwrite(STDERR, "Packet YAML root must be a map\n");
    exit(1);
}

$decision = buildDecision($packet, $root);
$decision['packet_path'] = $packetPath;

if ($format === 'shell') {
    foreach ($decision as $key => $value) {
        $name = strtoupper($key);
        $encoded = is_bool($value) ? ($value ? '1' : '0') : (string) $value;
        echo $name . '=' . $encoded . PHP_EOL;
    }
    exit(0);
}

echo json_encode($decision, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
