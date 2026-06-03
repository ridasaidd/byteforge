<?php

declare(strict_types=1);

require __DIR__ . '/../../vendor/autoload.php';

use Symfony\Component\Yaml\Exception\ParseException;
use Symfony\Component\Yaml\Yaml;

function usage(): void
{
    fwrite(STDERR, <<<TXT
Usage:
  php scripts/opencode/state.php init
  php scripts/opencode/state.php ingest-packet --packet <file>
  php scripts/opencode/state.php ingest-artifact --artifact <file>
  php scripts/opencode/state.php ingest-latest [--packet-id <id>]
  php scripts/opencode/state.php record-failure --packet-id <id> [--failure-type <type>] [--attempt <n>] [--session-id <id>] [--transport <t>] [--artifact-path <p>] [--model <m>] [--provider <p>] [--variant <v>] [--task-class <c>] [--phase <p>] [--packet-path <p>]
  php scripts/opencode/state.php context --packet-id <id> [--limit <n>]
  php scripts/opencode/state.php report [--task-class <id>] [--limit <n>]
  php scripts/opencode/state.php backfill-runs [--packet-id <id>] [--limit <n>] [--dry-run]
  php scripts/opencode/state.php calibrate-routing [--task-class <id>] [--risk-level <id>] [--min-runs <n>] [--limit <n>] [--apply]
  php scripts/opencode/state.php route-upsert --task-class <id|*> --risk-level <id|*> --provider <id> --model <id> [--variant <id>] [--priority <n>] [--enabled 0|1]
  php scripts/opencode/state.php route-list [--task-class <id>]

Environment:
    OPENCODE_RUNTIME_DIR (optional, defaults to .opencode/runtime)
    OPENCODE_STATE_DB (optional, defaults to <runtime>/opencode-state.sqlite)
TXT
    );
}

function parseArgs(array $argv): array
{
    $args = [];

    for ($i = 0; $i < count($argv); $i++) {
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

function getProjectRoot(): string
{
    $root = realpath(__DIR__ . '/../../');
    if ($root === false) {
        throw new RuntimeException('Unable to resolve project root');
    }

    return $root;
}

function dbPath(): string
{
    $custom = getenv('OPENCODE_STATE_DB');
    if (is_string($custom) && trim($custom) !== '') {
        return $custom;
    }

    return runtimeRootPath() . '/opencode-state.sqlite';
}

function runtimeRootPath(): string
{
    $custom = getenv('OPENCODE_RUNTIME_DIR');
    if (is_string($custom) && trim($custom) !== '') {
        $trimmed = trim($custom);
        if (str_starts_with($trimmed, '/')) {
            return $trimmed;
        }

        return getProjectRoot() . '/' . $trimmed;
    }

    return getProjectRoot() . '/.opencode/runtime';
}

function connectDb(): PDO
{
    $path = dbPath();
    $dir = dirname($path);

    if (!is_dir($dir) && !mkdir($dir, 0775, true) && !is_dir($dir)) {
        throw new RuntimeException('Unable to create DB directory: ' . $dir);
    }

    try {
        $pdo = new PDO('sqlite:' . $path);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        return $pdo;
    } catch (PDOException $e) {
        throw new RuntimeException('Unable to open SQLite DB: ' . $e->getMessage());
    }
}

function ensureSchema(PDO $pdo): void
{
    $pdo->exec(<<<SQL
CREATE TABLE IF NOT EXISTS packets (
  packet_id TEXT PRIMARY KEY,
  phase TEXT,
  task_class TEXT,
  risk_level TEXT,
  summary TEXT,
  last_attempt INTEGER DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id TEXT UNIQUE,
  packet_id TEXT NOT NULL,
    phase TEXT,
    task_class TEXT,
  attempt INTEGER,
  model TEXT,
    variant TEXT,
  provider TEXT,
  status TEXT NOT NULL,
  failure_type TEXT,
    input_tokens INTEGER,
    output_tokens INTEGER,
    cost REAL,
    duration_ms INTEGER,
  artifact_path TEXT UNIQUE,
  session_id TEXT,
  transport TEXT,
  issues_json TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (packet_id) REFERENCES packets(packet_id)
);

CREATE INDEX IF NOT EXISTS idx_runs_packet ON runs(packet_id);
CREATE INDEX IF NOT EXISTS idx_runs_created ON runs(created_at);

CREATE TABLE IF NOT EXISTS task_routing (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_class TEXT NOT NULL,
    risk_level TEXT NOT NULL,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    variant TEXT,
    priority INTEGER NOT NULL DEFAULT 100,
    enabled INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL,
    UNIQUE(task_class, risk_level)
);

CREATE INDEX IF NOT EXISTS idx_task_routing_enabled_priority ON task_routing(enabled, priority);
SQL
    );
}

function ensureRunsColumns(PDO $pdo): void
{
    try {
        $stmt = $pdo->query('PRAGMA table_info(runs);');
        $columns = $stmt->fetchAll();
    } catch (Throwable) {
        return;
    }

    $existing = [];
    foreach ($columns as $column) {
        if (is_array($column) && isset($column['name'])) {
            $existing[(string) $column['name']] = true;
        }
    }

    $required = [
        'run_id' => 'TEXT',
        'phase' => 'TEXT',
        'task_class' => 'TEXT',
        'variant' => 'TEXT',
        'input_tokens' => 'INTEGER',
        'output_tokens' => 'INTEGER',
        'cost' => 'REAL',
        'duration_ms' => 'INTEGER',
    ];

    foreach ($required as $name => $type) {
        if (!isset($existing[$name])) {
            $pdo->exec(sprintf('ALTER TABLE runs ADD COLUMN %s %s;', $name, $type));
        }
    }

    $pdo->exec('CREATE INDEX IF NOT EXISTS idx_runs_task_class ON runs(task_class);');
    $pdo->exec('CREATE INDEX IF NOT EXISTS idx_runs_variant ON runs(variant);');
}

function resolvePath(string $input): string
{
    if (str_starts_with($input, '/')) {
        return $input;
    }

    return getProjectRoot() . '/' . $input;
}

function runsDirPath(): string
{
    return runtimeRootPath() . '/runs';
}

function latestPointerPath(): string
{
    return runsDirPath() . '/.latest';
}

function nowIso(): string
{
    return gmdate('c');
}

function normalizeScalar(mixed $value): ?string
{
    if ($value === null) {
        return null;
    }

    if (is_string($value)) {
        $trimmed = trim($value);
        return $trimmed === '' ? null : $trimmed;
    }

    if (is_numeric($value)) {
        return (string) $value;
    }

    if (is_bool($value)) {
        return $value ? 'true' : 'false';
    }

    return null;
}

function isoFromEpochMilliseconds(?int $value): ?string
{
    if ($value === null || $value <= 0) {
        return null;
    }

    $seconds = intdiv($value, 1000);
    if ($seconds <= 0) {
        return null;
    }

    return gmdate('c', $seconds);
}

function runIdFromArtifactPath(string $artifactPath): string
{
    return 'art_' . sha1($artifactPath);
}

function extractRunMetrics(array $artifact): array
{
    $raw = is_array($artifact['raw'] ?? null) ? $artifact['raw'] : [];
    $info = is_array($raw['info'] ?? null) ? $raw['info'] : [];
    $tokens = is_array($info['tokens'] ?? null) ? $info['tokens'] : [];
    $time = is_array($info['time'] ?? null) ? $info['time'] : [];

    $input = is_numeric($tokens['input'] ?? null) ? (int) $tokens['input'] : null;
    $output = is_numeric($tokens['output'] ?? null) ? (int) $tokens['output'] : null;
    $cost = is_numeric($info['cost'] ?? null) ? (float) $info['cost'] : null;

    $createdMs = is_numeric($time['created'] ?? null) ? (int) $time['created'] : null;
    $completedMs = is_numeric($time['completed'] ?? null) ? (int) $time['completed'] : null;
    $duration = null;
    if ($createdMs !== null && $completedMs !== null && $completedMs >= $createdMs) {
        $duration = $completedMs - $createdMs;
    }

    return [
        'input_tokens' => $input,
        'output_tokens' => $output,
        'cost' => $cost,
        'duration_ms' => $duration,
        'created_at' => isoFromEpochMilliseconds($completedMs ?? $createdMs) ?? nowIso(),
    ];
}

function parsePacketFile(string $packetPath): array
{
    try {
        $packet = Yaml::parseFile($packetPath);
    } catch (ParseException $e) {
        throw new RuntimeException('Packet YAML parse error: ' . $e->getMessage());
    }

    if (!is_array($packet)) {
        throw new RuntimeException('Packet YAML root must be a map');
    }

    $taskRef = is_array($packet['task_ref'] ?? null) ? $packet['task_ref'] : [];
    $policy = is_array($packet['execution_policy'] ?? null) ? $packet['execution_policy'] : [];

    return [
        'packet_id' => normalizeScalar($taskRef['packet_id'] ?? null) ?? 'packet',
        'phase' => normalizeScalar($taskRef['phase'] ?? null),
        'last_attempt' => (int) (normalizeScalar($taskRef['attempt'] ?? null) ?? '0'),
        'task_class' => normalizeScalar($policy['task_class'] ?? null),
        'risk_level' => normalizeScalar($policy['risk_level'] ?? null),
        'summary' => normalizeScalar($packet['summary'] ?? null),
    ];
}

function validateAssistantYaml(string $assistantText): array
{
    $issues = [];

    try {
        $parsed = Yaml::parse($assistantText);
    } catch (ParseException $e) {
        return [
            'valid' => false,
            'status' => 'failed:invalid_schema',
            'failure_type' => null,
            'task_ref' => null,
            'issues' => ['invalid yaml syntax'],
            'executor_model' => null,
            'phase' => null,
            'attempt' => null,
            'packet_id' => null,
        ];
    }

    if (!is_array($parsed)) {
        return [
            'valid' => false,
            'status' => 'failed:invalid_schema',
            'failure_type' => null,
            'task_ref' => null,
            'issues' => ['yaml root must be a map'],
            'executor_model' => null,
            'phase' => null,
            'attempt' => null,
            'packet_id' => null,
        ];
    }

    $status = normalizeScalar($parsed['status'] ?? null);
    $taskRef = is_array($parsed['task_ref'] ?? null) ? $parsed['task_ref'] : null;

    if ($status === null) {
        $issues[] = 'missing status';
    } elseif ($status !== 'success' && $status !== 'failed') {
        $issues[] = 'status must be success or failed';
    }

    if ($taskRef === null) {
        $issues[] = 'missing task_ref map';
    }

    $failureType = null;
    if ($status === 'failed') {
        $failureType = normalizeScalar($parsed['failure_type'] ?? null);
        if ($failureType === null) {
            $issues[] = 'missing failure_type for failed status';
        } elseif (!in_array($failureType, [
            'requirement_mismatch',
            'test_failure',
            'environment_blocker',
            'ambiguity_in_spec',
            'unsafe_change_risk',
            'dependency_gap',
        ], true)) {
            $issues[] = 'failure_type is not in allowed set';
        }
    }

    $packetID = $taskRef ? normalizeScalar($taskRef['packet_id'] ?? null) : null;
    $phase = $taskRef ? normalizeScalar($taskRef['phase'] ?? null) : null;
    $attempt = $taskRef ? normalizeScalar($taskRef['attempt'] ?? null) : null;
    $executorModel = $taskRef ? normalizeScalar($taskRef['executor_model'] ?? null) : null;

    if (!$packetID) {
        $issues[] = 'missing task_ref.packet_id';
    }

    if (!$phase) {
        $issues[] = 'missing task_ref.phase';
    }

    if (!$attempt) {
        $issues[] = 'missing task_ref.attempt';
    }

    if (!$executorModel) {
        $issues[] = 'missing task_ref.executor_model';
    }

    $resolvedStatus = count($issues) === 0
        ? ($status === 'failed' ? 'failed:' . $failureType : 'success')
        : 'failed:invalid_schema';

    return [
        'valid' => count($issues) === 0,
        'status' => $resolvedStatus,
        'failure_type' => $failureType,
        'task_ref' => $taskRef,
        'issues' => $issues,
        'executor_model' => $executorModel,
        'phase' => $phase,
        'attempt' => $attempt !== null ? (int) $attempt : null,
        'packet_id' => $packetID,
    ];
}

function upsertPacket(PDO $pdo, array $packet): void
{
    $stmt = $pdo->prepare(<<<SQL
INSERT INTO packets (packet_id, phase, task_class, risk_level, summary, last_attempt, updated_at)
VALUES (:packet_id, :phase, :task_class, :risk_level, :summary, :last_attempt, :updated_at)
ON CONFLICT(packet_id) DO UPDATE SET
  phase = COALESCE(excluded.phase, packets.phase),
  task_class = COALESCE(excluded.task_class, packets.task_class),
  risk_level = COALESCE(excluded.risk_level, packets.risk_level),
  summary = COALESCE(excluded.summary, packets.summary),
  last_attempt = CASE WHEN excluded.last_attempt > packets.last_attempt THEN excluded.last_attempt ELSE packets.last_attempt END,
  updated_at = excluded.updated_at;
SQL
    );

    $stmt->execute([
        ':packet_id' => $packet['packet_id'],
        ':phase' => $packet['phase'] ?? null,
        ':task_class' => $packet['task_class'] ?? null,
        ':risk_level' => $packet['risk_level'] ?? null,
        ':summary' => $packet['summary'] ?? null,
        ':last_attempt' => (int) ($packet['last_attempt'] ?? 0),
        ':updated_at' => nowIso(),
    ]);
}

function ingestPacketCommand(PDO $pdo, array $args): void
{
    $packetArg = normalizeScalar($args['packet'] ?? null);
    if ($packetArg === null) {
        throw new RuntimeException('--packet is required');
    }

    $packetPath = resolvePath($packetArg);
    if (!is_file($packetPath)) {
        throw new RuntimeException('Packet not found: ' . $packetPath);
    }

    $packet = parsePacketFile($packetPath);
    upsertPacket($pdo, $packet);

    echo json_encode([
        'ok' => true,
        'packet_id' => $packet['packet_id'],
        'db_path' => dbPath(),
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
}

function isSuccessArtifact(string $artifactPath): bool
{
    if (!is_file($artifactPath)) {
        return false;
    }
    $raw = file_get_contents($artifactPath);
    $content = is_string($raw) ? json_decode($raw, true) : null;
    if (!is_array($content)) {
        return false;
    }
    $assistantText = (string) ($content['assistantText'] ?? '');
    return str_contains($assistantText, 'status: success');
}

function latestArtifactPath(?string $packetID = null): ?string
{
    $dir = runsDirPath();
    if (!is_dir($dir)) {
        return null;
    }

    $pointerFile = $dir . '/.latest';
    $latestRef = null;
    if (is_file($pointerFile)) {
        $ref = trim(file_get_contents($pointerFile) ?: '');
        if ($ref !== '' && is_file($ref)) {
            $latestRef = $ref;
            if ($packetID === null) {
                return $ref;
            }
        }
    }

    $files = glob($dir . '/*.json');
    if (!is_array($files) || count($files) === 0) {
        return null;
    }

    if ($packetID !== null) {
        $matching = [];
        foreach ($files as $f) {
            $contentRaw = file_get_contents($f);
            $content = is_string($contentRaw) ? json_decode($contentRaw, true) : null;
            $id = normalizeScalar(is_array($content) ? ($content['packetID'] ?? null) : null) ?? '';
            if ($id === $packetID) {
                $matching[] = $f;
            }
        }
        if (count($matching) > 0) {
            usort($matching, static function (string $a, string $b): int {
                $aSuccess = isSuccessArtifact($a);
                $bSuccess = isSuccessArtifact($b);
                if ($aSuccess !== $bSuccess) {
                    return $aSuccess <=> $bSuccess;
                }
                return filemtime($b) <=> filemtime($a);
            });
            $chosen = $matching[0];
            if ($chosen !== $latestRef) {
                file_put_contents($pointerFile, $chosen . PHP_EOL);
            }
            return $chosen;
        }
        return null;
    }

    usort($files, static fn (string $a, string $b): int => filemtime($b) <=> filemtime($a));
    $latest = $files[0] ?? null;
    if ($latest !== null && $latest !== $latestRef) {
        file_put_contents($pointerFile, $latest . PHP_EOL);
    }
    return $latest;
}

function ingestArtifact(PDO $pdo, string $artifactPath, bool $updateLatestPointer = true): array
{
    if (!is_file($artifactPath)) {
        throw new RuntimeException('Artifact not found: ' . $artifactPath);
    }

    $raw = file_get_contents($artifactPath);
    if ($raw === false) {
        throw new RuntimeException('Unable to read artifact: ' . $artifactPath);
    }

    $artifact = json_decode($raw, true);
    if (!is_array($artifact)) {
        throw new RuntimeException('Artifact JSON invalid: ' . $artifactPath);
    }

    $validation = validateAssistantYaml((string) ($artifact['assistantText'] ?? ''));
    $artifactPacketID = is_array($artifact) ? normalizeScalar($artifact['packetID'] ?? null) : null;
    $packetID = $validation['packet_id'] ?? $artifactPacketID ?? 'packet';

    $packet = [
        'packet_id' => $packetID,
        'phase' => $validation['phase'],
        'task_class' => null,
        'risk_level' => null,
        'summary' => null,
        'last_attempt' => (int) ($validation['attempt'] ?? 0),
    ];

    $packetPath = is_array($artifact) ? normalizeScalar($artifact['packetPath'] ?? null) : null;
    if ($packetPath !== null && is_file($packetPath)) {
        $packetFromFile = parsePacketFile($packetPath);
        $packet['phase'] = $packet['phase'] ?? $packetFromFile['phase'];
        $packet['task_class'] = $packetFromFile['task_class'];
        $packet['risk_level'] = $packetFromFile['risk_level'];
        $packet['summary'] = $packetFromFile['summary'];
        if (($packet['last_attempt'] ?? 0) === 0) {
            $packet['last_attempt'] = (int) ($packetFromFile['last_attempt'] ?? 0);
        }
    }

    upsertPacket($pdo, $packet);

        $stmt = $pdo->prepare(<<<SQL
INSERT OR REPLACE INTO runs (
    id, run_id, packet_id, phase, task_class, attempt, model, variant, provider, status, failure_type,
    input_tokens, output_tokens, cost, duration_ms,
    artifact_path, session_id, transport, issues_json, created_at
) VALUES (
  (SELECT id FROM runs WHERE artifact_path = :artifact_path),
    :run_id, :packet_id, :phase, :task_class, :attempt, :model, :variant, :provider, :status, :failure_type,
    :input_tokens, :output_tokens, :cost, :duration_ms,
    :artifact_path, :session_id, :transport, :issues_json, :created_at
);
SQL
    );

    $model = $validation['executor_model'] ?? null;
        $provider = normalizeScalar($artifact['provider'] ?? null);
        $variant = normalizeScalar($artifact['variant'] ?? null);
        $metrics = extractRunMetrics($artifact);

    $stmt->execute([
                ':run_id' => runIdFromArtifactPath($artifactPath),
        ':packet_id' => $packetID,
                ':phase' => $packet['phase'] ?? null,
                ':task_class' => $packet['task_class'] ?? null,
        ':attempt' => $validation['attempt'] ?? null,
        ':model' => $model,
                ':variant' => $variant,
        ':provider' => $provider,
        ':status' => $validation['status'],
        ':failure_type' => $validation['failure_type'],
                ':input_tokens' => $metrics['input_tokens'],
                ':output_tokens' => $metrics['output_tokens'],
                ':cost' => $metrics['cost'],
                ':duration_ms' => $metrics['duration_ms'],
        ':artifact_path' => $artifactPath,
        ':session_id' => normalizeScalar($artifact['sessionID'] ?? null),
        ':transport' => normalizeScalar($artifact['transport'] ?? null),
        ':issues_json' => json_encode($validation['issues'], JSON_UNESCAPED_SLASHES),
                ':created_at' => $metrics['created_at'],
    ]);

    if ($updateLatestPointer) {
        $pointerFile = latestPointerPath();
        file_put_contents($pointerFile, $artifactPath . PHP_EOL);
    }

    return [
        'ok' => true,
        'packet_id' => $packetID,
        'status' => $validation['status'],
        'artifact_path' => $artifactPath,
        'db_path' => dbPath(),
    ];
}

function ingestArtifactCommand(PDO $pdo, array $args): void
{
    $artifactArg = normalizeScalar($args['artifact'] ?? null);
    if ($artifactArg === null) {
        throw new RuntimeException('--artifact is required');
    }

    $artifactPath = resolvePath($artifactArg);
    $result = ingestArtifact($pdo, $artifactPath);
    echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
}

function ingestLatestCommand(PDO $pdo, array $args): void
{
    $packetID = normalizeScalar($args['packet-id'] ?? null);
    $path = latestArtifactPath($packetID);
    if ($path === null) {
        throw new RuntimeException('No artifacts found in ' . runsDirPath());
    }

    $result = ingestArtifact($pdo, $path);
    echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
}

function writeFailureArtifact(PDO $pdo, string $packetID, ?int $attempt, ?string $model, string $failureType, ?string $provider = null, ?string $variant = null, ?string $packetPath = null): string
{
    $now = nowIso();
    $timestamp = str_replace([':', '.'], '-', $now);
    $dir = runsDirPath();
    if (!is_dir($dir) && !mkdir($dir, 0775, true) && !is_dir($dir)) {
        throw new RuntimeException('Unable to create artifact directory: ' . $dir);
    }

    $phaseStmt = $pdo->prepare('SELECT phase FROM packets WHERE packet_id = :packet_id');
    $phaseStmt->execute([':packet_id' => $packetID]);
    $phaseRow = $phaseStmt->fetch();
    $phase = is_array($phaseRow) && ($phaseRow['phase'] ?? null) !== null ? $phaseRow['phase'] : 'N/A';

    $assistantText = [
        'schema_version: 1',
        'status: failed',
        'failure_type: ' . $failureType,
        'task_ref:',
        '  packet_id: ' . $packetID,
        '  phase: ' . $phase,
        '  attempt: ' . ($attempt ?? 1),
        '  executor_model: ' . ($model ?? 'unknown'),
    ];

    $artifact = [
        'ok' => false,
        'sessionID' => null,
        'transport' => null,
        'packetID' => $packetID,
        'attempt' => $attempt ?? 1,
        'provider' => $provider,
        'model' => $model,
        'variant' => $variant,
        'assistantText' => implode(PHP_EOL, $assistantText),
        'packetPath' => $packetPath,
        'raw' => null,
    ];

    $artifactPath = $dir . '/' . $timestamp . '-' . $packetID . '.json';
    $suffix = '';
    for ($try = 0; $try < 100; $try++) {
        $candidate = $dir . '/' . $timestamp . $suffix . '-' . $packetID . '.json';
        if (!is_file($candidate)) {
            $artifactPath = $candidate;
            break;
        }
        $suffix = '-' . $try;
    }
    file_put_contents($artifactPath, json_encode($artifact, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL);

    $pointerFile = $dir . '/.latest';
    file_put_contents($pointerFile, $artifactPath . PHP_EOL);

    return $artifactPath;
}

function recordFailureCommand(PDO $pdo, array $args): void
{
    $packetID = normalizeScalar($args['packet-id'] ?? null);
    if ($packetID === null) {
        throw new RuntimeException('--packet-id is required');
    }

    $attempt = is_numeric($args['attempt'] ?? null) ? (int) $args['attempt'] : null;
    $model = normalizeScalar($args['model'] ?? null);
    $provider = normalizeScalar($args['provider'] ?? null);
    $variant = normalizeScalar($args['variant'] ?? null);
    $taskClass = normalizeScalar($args['task-class'] ?? null);
    $phase = normalizeScalar($args['phase'] ?? null);
    $failureType = normalizeScalar($args['failure-type'] ?? null) ?? 'environment_blocker';
    $sessionID = normalizeScalar($args['session-id'] ?? null);
    $transport = normalizeScalar($args['transport'] ?? null);
    $artifactPath = normalizeScalar($args['artifact-path'] ?? null);
    $packetPath = normalizeScalar($args['packet-path'] ?? null);

    if ($artifactPath === null) {
        $artifactPath = writeFailureArtifact($pdo, $packetID, $attempt, $model, $failureType, $provider, $variant, $packetPath);
    }

    $upsertPacketStmt = $pdo->prepare(<<<SQL
INSERT INTO packets (packet_id, phase, task_class, last_attempt, updated_at)
VALUES (:packet_id, :phase, :task_class, COALESCE(:attempt, 0), :updated_at)
ON CONFLICT(packet_id) DO UPDATE SET
    phase = COALESCE(excluded.phase, packets.phase),
    task_class = COALESCE(excluded.task_class, packets.task_class),
  last_attempt = CASE
    WHEN COALESCE(:attempt, 0) > packets.last_attempt THEN COALESCE(:attempt, 0)
    ELSE packets.last_attempt
  END,
  updated_at = excluded.updated_at;
SQL
    );
    $upsertPacketStmt->execute([
        ':packet_id' => $packetID,
        ':phase' => $phase,
        ':task_class' => $taskClass,
        ':attempt' => $attempt,
        ':updated_at' => nowIso(),
    ]);

    $stmt = $pdo->prepare(<<<SQL
INSERT INTO runs (
    run_id, packet_id, phase, task_class, attempt, model, variant, provider,
    status, failure_type, input_tokens, output_tokens, cost, duration_ms,
    artifact_path, session_id, transport, created_at
)
VALUES (
    :run_id, :packet_id, :phase, :task_class, :attempt, :model, :variant, :provider,
    :status, :failure_type, :input_tokens, :output_tokens, :cost, :duration_ms,
    :artifact_path, :session_id, :transport, :created_at
);
SQL
    );

    $runID = 'fail_' . sha1($packetID . '|' . ($artifactPath ?? '') . '|' . nowIso());
    $stmt->execute([
        ':run_id' => $runID,
        ':packet_id' => $packetID,
        ':phase' => $phase,
        ':task_class' => $taskClass,
        ':attempt' => $attempt,
        ':model' => $model,
        ':variant' => $variant,
        ':provider' => $provider,
        ':status' => 'failed:' . $failureType,
        ':failure_type' => $failureType,
        ':input_tokens' => null,
        ':output_tokens' => null,
        ':cost' => null,
        ':duration_ms' => null,
        ':artifact_path' => $artifactPath,
        ':session_id' => $sessionID,
        ':transport' => $transport,
        ':created_at' => nowIso(),
    ]);

    echo json_encode([
        'ok' => true,
        'packet_id' => $packetID,
        'status' => 'failed:' . $failureType,
        'artifact_path' => $artifactPath,
        'db_path' => dbPath(),
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
}

function routeUpsertCommand(PDO $pdo, array $args): void
{
    $taskClass = normalizeScalar($args['task-class'] ?? null);
    $riskLevel = normalizeScalar($args['risk-level'] ?? null);
    $provider = normalizeScalar($args['provider'] ?? null);
    $model = normalizeScalar($args['model'] ?? null);
    $variant = normalizeScalar($args['variant'] ?? null);
    $priorityRaw = normalizeScalar($args['priority'] ?? null);
    $enabledRaw = normalizeScalar($args['enabled'] ?? null);

    if ($taskClass === null || $riskLevel === null || $provider === null || $model === null) {
        throw new RuntimeException('--task-class, --risk-level, --provider, and --model are required');
    }

    $priority = $priorityRaw !== null ? (int) $priorityRaw : 100;
    $enabled = $enabledRaw !== null ? (int) $enabledRaw : 1;
    if ($enabled !== 0 && $enabled !== 1) {
        throw new RuntimeException('--enabled must be 0 or 1');
    }

    $stmt = $pdo->prepare(<<<SQL
INSERT INTO task_routing (task_class, risk_level, provider, model, variant, priority, enabled, updated_at)
VALUES (:task_class, :risk_level, :provider, :model, :variant, :priority, :enabled, :updated_at)
ON CONFLICT(task_class, risk_level) DO UPDATE SET
  provider = excluded.provider,
  model = excluded.model,
  variant = excluded.variant,
  priority = excluded.priority,
  enabled = excluded.enabled,
  updated_at = excluded.updated_at;
SQL
    );

    $stmt->execute([
        ':task_class' => $taskClass,
        ':risk_level' => $riskLevel,
        ':provider' => $provider,
        ':model' => $model,
        ':variant' => $variant,
        ':priority' => $priority,
        ':enabled' => $enabled,
        ':updated_at' => nowIso(),
    ]);

    echo json_encode([
        'ok' => true,
        'task_class' => $taskClass,
        'risk_level' => $riskLevel,
        'provider' => $provider,
        'model' => $model,
        'variant' => $variant,
        'priority' => $priority,
        'enabled' => $enabled,
        'db_path' => dbPath(),
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
}

function routeListCommand(PDO $pdo, array $args): void
{
    $taskClass = normalizeScalar($args['task-class'] ?? null);
    $sql = 'SELECT task_class, risk_level, provider, model, variant, priority, enabled, updated_at FROM task_routing';
    $params = [];
    if ($taskClass !== null) {
        $sql .= ' WHERE task_class = :task_class';
        $params[':task_class'] = $taskClass;
    }
    $sql .= ' ORDER BY priority ASC, task_class ASC, risk_level ASC';

    $stmt = $pdo->prepare($sql);
    foreach ($params as $key => $value) {
        $stmt->bindValue($key, $value);
    }
    $stmt->execute();

    echo json_encode([
        'routes' => $stmt->fetchAll(),
        'db_path' => dbPath(),
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
}

function backfillRunsCommand(PDO $pdo, array $args): void
{
    $packetID = normalizeScalar($args['packet-id'] ?? null);
    $limitRaw = normalizeScalar($args['limit'] ?? null);
    $limit = $limitRaw !== null ? max(1, (int) $limitRaw) : null;
    $dryRun = isset($args['dry-run']);

    $dir = runsDirPath();
    if (!is_dir($dir)) {
        throw new RuntimeException('Runs directory not found: ' . $dir);
    }

    $files = glob($dir . '/*.json') ?: [];
    usort($files, static fn (string $a, string $b): int => filemtime($a) <=> filemtime($b));

    $selected = [];
    foreach ($files as $file) {
        if ($packetID !== null) {
            $raw = file_get_contents($file);
            $decoded = is_string($raw) ? json_decode($raw, true) : null;
            $artifactPacketID = normalizeScalar(is_array($decoded) ? ($decoded['packetID'] ?? null) : null);
            if ($artifactPacketID !== $packetID) {
                continue;
            }
        }
        $selected[] = $file;
        if ($limit !== null && count($selected) >= $limit) {
            break;
        }
    }

    $latestPath = latestPointerPath();
    $latestBefore = is_file($latestPath) ? trim((string) file_get_contents($latestPath)) : null;

    $processed = 0;
    $updated = 0;
    $skipped = 0;
    $errors = [];

    foreach ($selected as $file) {
        $processed += 1;
        if ($dryRun) {
            $skipped += 1;
            continue;
        }

        try {
            ingestArtifact($pdo, $file, false);
            $updated += 1;
        } catch (Throwable $e) {
            $errors[] = [
                'artifact' => $file,
                'error' => $e->getMessage(),
            ];
        }
    }

    if (!$dryRun) {
        if ($latestBefore !== null && $latestBefore !== '') {
            file_put_contents($latestPath, $latestBefore . PHP_EOL);
        } elseif (is_file($latestPath)) {
            unlink($latestPath);
        }
    }

    echo json_encode([
        'ok' => count($errors) === 0,
        'packet_id' => $packetID,
        'dry_run' => $dryRun,
        'processed' => $processed,
        'updated' => $updated,
        'skipped' => $skipped,
        'errors' => $errors,
        'db_path' => dbPath(),
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
}

function calibrateRoutingCommand(PDO $pdo, array $args): void
{
    $taskClassFilter = normalizeScalar($args['task-class'] ?? null);
    $riskLevelFilter = normalizeScalar($args['risk-level'] ?? null);
    $minRunsRaw = normalizeScalar($args['min-runs'] ?? null);
    $limitRaw = normalizeScalar($args['limit'] ?? null);
    $minRuns = $minRunsRaw !== null ? max(1, (int) $minRunsRaw) : 3;
    $limit = $limitRaw !== null ? max(1, (int) $limitRaw) : 50;
    $apply = isset($args['apply']);

    $where = ['r.model IS NOT NULL'];
    $params = [];
    if ($taskClassFilter !== null) {
        $where[] = "COALESCE(r.task_class, p.task_class, 'unknown') = :task_class";
        $params[':task_class'] = $taskClassFilter;
    }
    if ($riskLevelFilter !== null) {
        $where[] = "COALESCE(p.risk_level, '*') = :risk_level";
        $params[':risk_level'] = $riskLevelFilter;
    }

    $sql = <<<SQL
SELECT
  COALESCE(r.task_class, p.task_class, 'unknown') AS task_class,
  COALESCE(p.risk_level, '*') AS risk_level,
    COALESCE(r.provider, 'opencode-go') AS provider,
  r.model AS model,
  COALESCE(r.variant, r.model, 'unknown') AS variant,
  COUNT(*) AS runs,
  AVG(CASE WHEN r.status = 'success' THEN 1.0 ELSE 0.0 END) AS pass_rate,
  AVG(r.cost) AS avg_cost,
  AVG(r.duration_ms) AS avg_duration_ms
FROM runs r
LEFT JOIN packets p ON p.packet_id = r.packet_id
WHERE %s
GROUP BY
  COALESCE(r.task_class, p.task_class, 'unknown'),
  COALESCE(p.risk_level, '*'),
    COALESCE(r.provider, 'opencode-go'),
  r.model,
  COALESCE(r.variant, r.model, 'unknown')
HAVING COUNT(*) >= :min_runs
ORDER BY task_class ASC, risk_level ASC, pass_rate DESC, avg_cost ASC, runs DESC
LIMIT :limit;
SQL;

    $stmt = $pdo->prepare(sprintf($sql, implode(' AND ', $where)));
    foreach ($params as $key => $value) {
        $stmt->bindValue($key, $value);
    }
    $stmt->bindValue(':min_runs', $minRuns, PDO::PARAM_INT);
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->execute();
    $rows = $stmt->fetchAll();

    $bestByKey = [];
    foreach ($rows as $row) {
        $taskClass = (string) ($row['task_class'] ?? 'unknown');
        $riskLevel = (string) ($row['risk_level'] ?? '*');
        $key = $taskClass . '|' . $riskLevel;

        if (!isset($bestByKey[$key])) {
            $bestByKey[$key] = $row;
            continue;
        }

        $current = $bestByKey[$key];
        $passA = (float) ($row['pass_rate'] ?? 0.0);
        $passB = (float) ($current['pass_rate'] ?? 0.0);
        $runsA = (int) ($row['runs'] ?? 0);
        $runsB = (int) ($current['runs'] ?? 0);
        $costA = $row['avg_cost'] !== null ? (float) $row['avg_cost'] : INF;
        $costB = $current['avg_cost'] !== null ? (float) $current['avg_cost'] : INF;

        $replace = false;
        if ($passA > $passB) {
            $replace = true;
        } elseif ($passA === $passB && $costA < $costB) {
            $replace = true;
        } elseif ($passA === $passB && $costA === $costB && $runsA > $runsB) {
            $replace = true;
        }

        if ($replace) {
            $bestByKey[$key] = $row;
        }
    }

    $recommendations = array_values($bestByKey);
    usort($recommendations, static function (array $a, array $b): int {
        $keyA = ($a['task_class'] ?? '') . '|' . ($a['risk_level'] ?? '');
        $keyB = ($b['task_class'] ?? '') . '|' . ($b['risk_level'] ?? '');
        return strcmp($keyA, $keyB);
    });

    $applied = [];
    if ($apply) {
        $upsert = $pdo->prepare(<<<SQL
INSERT INTO task_routing (task_class, risk_level, provider, model, variant, priority, enabled, updated_at)
VALUES (:task_class, :risk_level, :provider, :model, :variant, :priority, 1, :updated_at)
ON CONFLICT(task_class, risk_level) DO UPDATE SET
  provider = excluded.provider,
  model = excluded.model,
  variant = excluded.variant,
  priority = excluded.priority,
  enabled = excluded.enabled,
  updated_at = excluded.updated_at;
SQL
        );

        foreach ($recommendations as $rec) {
            $upsert->execute([
                ':task_class' => (string) ($rec['task_class'] ?? 'unknown'),
                ':risk_level' => (string) ($rec['risk_level'] ?? '*'),
                ':provider' => (string) ($rec['provider'] ?? 'opencode-go'),
                ':model' => (string) ($rec['model'] ?? 'deepseek-v4-flash'),
                ':variant' => (string) ($rec['variant'] ?? 'unknown'),
                ':priority' => 50,
                ':updated_at' => nowIso(),
            ]);

            $applied[] = [
                'task_class' => (string) ($rec['task_class'] ?? 'unknown'),
                'risk_level' => (string) ($rec['risk_level'] ?? '*'),
                'provider' => (string) ($rec['provider'] ?? 'opencode-go'),
                'model' => (string) ($rec['model'] ?? 'deepseek-v4-flash'),
                'variant' => (string) ($rec['variant'] ?? 'unknown'),
            ];
        }
    }

    $commands = [];
    foreach ($recommendations as $rec) {
        $commands[] = sprintf(
            'npm run opencode:state:route-upsert -- --task-class %s --risk-level %s --provider %s --model %s --variant %s --priority 50 --enabled 1',
            (string) ($rec['task_class'] ?? 'unknown'),
            (string) ($rec['risk_level'] ?? '*'),
            (string) ($rec['provider'] ?? 'opencode-go'),
            (string) ($rec['model'] ?? 'deepseek-v4-flash'),
            (string) ($rec['variant'] ?? 'unknown'),
        );
    }

    echo json_encode([
        'filters' => [
            'task_class' => $taskClassFilter,
            'risk_level' => $riskLevelFilter,
            'min_runs' => $minRuns,
            'limit' => $limit,
        ],
        'recommendations' => $recommendations,
        'commands' => $commands,
        'applied' => $applied,
        'db_path' => dbPath(),
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
}

function reportCommand(PDO $pdo, array $args): void
{
    $taskClassFilter = normalizeScalar($args['task-class'] ?? null);
    $limitRaw = normalizeScalar($args['limit'] ?? null);
    $limit = $limitRaw !== null ? max(1, (int) $limitRaw) : 50;

    $where = '';
    $params = [];
    if ($taskClassFilter !== null) {
        $where = 'WHERE task_class = :task_class';
        $params[':task_class'] = $taskClassFilter;
    }

    $variantStmt = $pdo->prepare(<<<SQL
SELECT
  COALESCE(variant, model, 'unknown') AS variant,
  COUNT(*) AS runs,
  ROUND(AVG(CASE WHEN status = 'success' THEN 1.0 ELSE 0.0 END) * 100.0, 2) AS pass_rate,
    ROUND(AVG(cost), 6) AS avg_cost,
    ROUND(AVG(duration_ms), 2) AS avg_duration_ms
FROM runs
{$where}
GROUP BY COALESCE(variant, model, 'unknown')
ORDER BY runs DESC
LIMIT :limit;
SQL
    );
    foreach ($params as $key => $value) {
        $variantStmt->bindValue($key, $value);
    }
    $variantStmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $variantStmt->execute();
    $byVariant = $variantStmt->fetchAll();

    $taskStmt = $pdo->prepare(<<<SQL
SELECT
  COALESCE(task_class, 'unknown') AS task_class,
  COUNT(*) AS runs,
  ROUND(AVG(CASE WHEN status = 'success' THEN 1.0 ELSE 0.0 END) * 100.0, 2) AS pass_rate,
    ROUND(AVG(attempt), 2) AS avg_attempt,
    ROUND(AVG(cost), 6) AS avg_cost
FROM runs
GROUP BY COALESCE(task_class, 'unknown')
ORDER BY pass_rate ASC, runs DESC
LIMIT :limit;
SQL
    );
    $taskStmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $taskStmt->execute();
    $byTaskClass = $taskStmt->fetchAll();

    $summaryStmt = $pdo->prepare(<<<SQL
SELECT
  COUNT(*) AS runs,
  SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) AS success_runs,
  SUM(CASE WHEN status LIKE 'failed:%' THEN 1 ELSE 0 END) AS failed_runs,
  SUM(input_tokens) AS total_input_tokens,
  SUM(output_tokens) AS total_output_tokens,
  SUM(COALESCE(input_tokens, 0) + COALESCE(output_tokens, 0)) AS total_tokens,
  ROUND(SUM(cost), 6) AS total_cost,
  ROUND(AVG(cost), 6) AS avg_cost,
  ROUND(AVG(duration_ms), 2) AS avg_duration_ms
FROM runs
{$where};
SQL
    );
    foreach ($params as $key => $value) {
        $summaryStmt->bindValue($key, $value);
    }
    $summaryStmt->execute();
    $summary = $summaryStmt->fetch() ?: [];

    echo json_encode([
        'filters' => [
            'task_class' => $taskClassFilter,
            'limit' => $limit,
        ],
        'summary' => [
            'runs' => (int) ($summary['runs'] ?? 0),
            'success_runs' => (int) ($summary['success_runs'] ?? 0),
            'failed_runs' => (int) ($summary['failed_runs'] ?? 0),
            'total_input_tokens' => isset($summary['total_input_tokens']) ? (int) $summary['total_input_tokens'] : null,
            'total_output_tokens' => isset($summary['total_output_tokens']) ? (int) $summary['total_output_tokens'] : null,
            'total_tokens' => isset($summary['total_tokens']) ? (int) $summary['total_tokens'] : null,
            'total_cost' => $summary['total_cost'] !== null ? (float) $summary['total_cost'] : null,
            'avg_cost' => $summary['avg_cost'] !== null ? (float) $summary['avg_cost'] : null,
            'avg_duration_ms' => $summary['avg_duration_ms'] !== null ? (float) $summary['avg_duration_ms'] : null,
        ],
        'by_variant' => $byVariant,
        'by_task_class' => $byTaskClass,
        'db_path' => dbPath(),
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
}

function contextCommand(PDO $pdo, array $args): void
{
    $packetID = normalizeScalar($args['packet-id'] ?? null);
    if ($packetID === null) {
        throw new RuntimeException('--packet-id is required');
    }

    $limitRaw = normalizeScalar($args['limit'] ?? null);
    $limit = $limitRaw !== null ? max(1, (int) $limitRaw) : 5;

    $packetStmt = $pdo->prepare('SELECT * FROM packets WHERE packet_id = :packet_id');
    $packetStmt->execute([':packet_id' => $packetID]);
    $packet = $packetStmt->fetch();

    $runsStmt = $pdo->prepare('SELECT packet_id, phase, task_class, attempt, model, variant, provider, status, failure_type, input_tokens, output_tokens, cost, duration_ms, artifact_path, created_at FROM runs WHERE packet_id = :packet_id ORDER BY id DESC LIMIT :limit');
    $runsStmt->bindValue(':packet_id', $packetID);
    $runsStmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $runsStmt->execute();
    $runs = $runsStmt->fetchAll();

    $statsStmt = $pdo->prepare(<<<SQL
SELECT
  COUNT(*) AS total_runs,
  SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) AS success_runs,
  SUM(CASE WHEN status LIKE 'failed:%' THEN 1 ELSE 0 END) AS failed_runs
FROM runs
WHERE packet_id = :packet_id;
SQL
    );
    $statsStmt->execute([':packet_id' => $packetID]);
    $stats = $statsStmt->fetch() ?: ['total_runs' => 0, 'success_runs' => 0, 'failed_runs' => 0];

    echo json_encode([
        'packet' => $packet ?: null,
        'stats' => [
            'total_runs' => (int) ($stats['total_runs'] ?? 0),
            'success_runs' => (int) ($stats['success_runs'] ?? 0),
            'failed_runs' => (int) ($stats['failed_runs'] ?? 0),
        ],
        'recent_runs' => $runs,
        'db_path' => dbPath(),
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
}

try {
    $argv = $_SERVER['argv'] ?? [];
    $command = $argv[1] ?? null;
    if ($command === null || in_array($command, ['-h', '--help'], true)) {
        usage();
        exit(0);
    }

    $args = parseArgs(array_slice($argv, 2));
    $pdo = connectDb();
    ensureSchema($pdo);
    ensureRunsColumns($pdo);

    switch ($command) {
        case 'init':
            echo json_encode([
                'ok' => true,
                'db_path' => dbPath(),
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
            break;

        case 'ingest-packet':
            ingestPacketCommand($pdo, $args);
            break;

        case 'ingest-artifact':
            ingestArtifactCommand($pdo, $args);
            break;

        case 'ingest-latest':
            ingestLatestCommand($pdo, $args);
            break;

        case 'record-failure':
            recordFailureCommand($pdo, $args);
            break;

        case 'context':
            contextCommand($pdo, $args);
            break;

        case 'report':
            reportCommand($pdo, $args);
            break;

        case 'backfill-runs':
            backfillRunsCommand($pdo, $args);
            break;

        case 'calibrate-routing':
            calibrateRoutingCommand($pdo, $args);
            break;

        case 'route-upsert':
            routeUpsertCommand($pdo, $args);
            break;

        case 'route-list':
            routeListCommand($pdo, $args);
            break;

        default:
            throw new RuntimeException('Unknown command: ' . $command);
    }
} catch (Throwable $e) {
    fwrite(STDERR, $e->getMessage() . PHP_EOL);
    exit(1);
}
