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
    fwrite(STDERR, "Usage:\n  php scripts/opencode/dispatch.php --packet <file>\n  php scripts/opencode/dispatch.php --packet-id <id> [--format json|shell]\n");
}

function fetchPacketFromDb(string $root, string $packetID): ?array
{
    $path = dbPath($root);
    if (!is_file($path)) {
        return null;
    }

    try {
        $pdo = new PDO('sqlite:' . $path);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

        $stmt = $pdo->prepare('SELECT packet_id, phase, task_class, risk_level, summary, packet_yaml FROM packets WHERE packet_id = :packet_id');
        $stmt->execute([':packet_id' => $packetID]);
        $row = $stmt->fetch();

        if (!$row) {
            return null;
        }

        if ($row['packet_yaml'] !== null && $row['packet_yaml'] !== '') {
            try {
                $parsed = Yaml::parse($row['packet_yaml']);
                if (is_array($parsed)) {
                    return $parsed;
                }
            } catch (ParseException) {
            }
        }

        $scopeIn = '[]';
        $scopeOut = '[]';
        $acceptance = '[]';
        $verification = '[]';
        $codeTargets = '[]';
        $docList = '[]';

        $taskStmt = $pdo->prepare('SELECT * FROM tasks WHERE task_id = :task_id');
        $taskStmt->execute([':task_id' => $packetID]);
        $task = $taskStmt->fetch();

        if ($task) {
            $scopeIn = $task['scope_in'] ?? '[]';
            $scopeOut = $task['scope_out'] ?? '[]';
            $acceptance = $task['acceptance_criteria'] ?? '[]';
            $verification = $task['verification'] ?? '[]';
            $codeTargets = $task['file_targets'] ?? '[]';
            $docList = $task['doc_allow_list'] ?? '[]';
        }

        return [
            'summary' => $row['summary'] ?? '',
            'task_ref' => [
                'packet_id' => $row['packet_id'],
                'phase' => $row['phase'] ?? 'UNKNOWN',
                'attempt' => 1,
            ],
            'execution_policy' => [
                'task_class' => $row['task_class'] ?? 'feature',
                'risk_level' => $row['risk_level'] ?? 'medium',
                'finalize_git' => false,
            ],
            'scope' => [
                'in' => json_decode($scopeIn, true) ?? [],
                'out' => json_decode($scopeOut, true) ?? [],
            ],
            'acceptance_criteria' => json_decode($acceptance, true) ?? [],
            'verification' => ['commands' => json_decode($verification, true) ?? []],
            'code_targets' => json_decode($codeTargets, true) ?? [],
            'doc_allow_list' => json_decode($docList, true) ?? [],
        ];
    } catch (Throwable) {
        return null;
    }
}

function dbPath(string $root): string
{
    $custom = getenv('OPENCODE_STATE_DB');
    if (is_string($custom) && trim($custom) !== '') {
        return $custom;
    }

    $runtimeDir = getenv('OPENCODE_RUNTIME_DIR');
    if (is_string($runtimeDir) && trim($runtimeDir) !== '') {
        $trimmed = trim($runtimeDir);
        if (str_starts_with($trimmed, '/')) {
            return $trimmed . '/opencode-state.sqlite';
        }

        return $root . '/' . $trimmed . '/opencode-state.sqlite';
    }

    return $root . '/.opencode/runtime/opencode-state.sqlite';
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
    $modelMedium = getenv('OPENCODE_MODEL_MEDIUM') ?: 'deepseek-v4-pro';
    $modelHigh = getenv('OPENCODE_MODEL_HIGH') ?: 'deepseek-v4-pro';

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
$hasPacket = isset($args['packet']) && is_string($args['packet']) && trim($args['packet']) !== '';
$hasPacketID = isset($args['packet-id']) && is_string($args['packet-id']) && trim($args['packet-id']) !== '';

if (!$hasPacket && !$hasPacketID) {
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

$packetPath = null;
$packet = null;

if ($hasPacketID) {
    $packet = fetchPacketFromDb($root, trim((string) $args['packet-id']));
    if ($packet === null) {
        fwrite(STDERR, "Packet ID not found in SQLite: {$args['packet-id']}\n");
        exit(1);
    }
    $packetPath = 'sqlite:' . trim((string) $args['packet-id']);
} else {
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
