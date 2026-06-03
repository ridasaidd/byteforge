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
  Tasks:
  php scripts/opencode/state.php task:create --task-id <id> --phase <id> --summary <text> [--scope-in <json>] [--scope-out <json>] [--file-targets <json>] [--acceptance-criteria <json>] [--verification <json>] [--task-class <id>] [--risk-level <id>] [--priority <n>]
  php scripts/opencode/state.php task:list [--phase <id>] [--completed 0|1] [--blocked 0|1] [--limit <n>]
  php scripts/opencode/state.php task:show --task-id <id>
  php scripts/opencode/state.php task:complete --task-id <id>
  php scripts/opencode/state.php task:block --task-id <id> --reason <text>
  php scripts/opencode/state.php task:unblock --task-id <id>
  Phase plans:
  php scripts/opencode/state.php plan:list [--status <active|completed|deferred>]
  php scripts/opencode/state.php plan:show --plan-key <key>
  php scripts/opencode/state.php plan:ingest --plan-key <key> --title <text> --file <path>
  Reference docs:
  php scripts/opencode/state.php ref:list
  php scripts/opencode/state.php ref:show --doc-key <key>
  php scripts/opencode/state.php ref:ingest --doc-key <key> --title <text> --file <path>
  Ingestion:
  php scripts/opencode/state.php ingest-all [--dry-run]
  php scripts/opencode/state.php task:ingest-packet --packet <file>
  php scripts/opencode/state.php build-packet --task-id <id>

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
  packet_yaml TEXT,
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
  artifact_json TEXT,
  session_id TEXT,
  transport TEXT,
  issues_json TEXT,
  prompt_text TEXT,
  prompt_hash TEXT,
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

CREATE TABLE IF NOT EXISTS tasks (
    task_id TEXT PRIMARY KEY,
    phase TEXT NOT NULL,
    summary TEXT NOT NULL,
    scope_in TEXT,
    scope_out TEXT,
    file_targets TEXT,
    acceptance_criteria TEXT,
    verification TEXT,
    doc_allow_list TEXT,
    parent_task_id TEXT,
    attempt INTEGER DEFAULT 1,
    executor_model TEXT,
    finalize_git INTEGER DEFAULT 0,
    stop_conditions TEXT,
    delegate_to_executor INTEGER DEFAULT 1,
    task_class TEXT,
    risk_level TEXT,
    priority INTEGER DEFAULT 0,
    completed INTEGER DEFAULT 0,
    completed_at TEXT,
    blocked INTEGER DEFAULT 0,
    blocked_reason TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (parent_task_id) REFERENCES tasks(task_id)
);

CREATE INDEX IF NOT EXISTS idx_tasks_phase ON tasks(phase);
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);
CREATE INDEX IF NOT EXISTS idx_tasks_blocked ON tasks(blocked);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);

CREATE TABLE IF NOT EXISTS phase_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_key TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reference_docs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    doc_key TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS phase_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phase TEXT NOT NULL,
    doc_key TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    run_id INTEGER,
    actor TEXT,
    payload_json TEXT,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_entity ON events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
SQL
    );
}

function emitEvent(PDO $pdo, string $eventType, string $entityType, string $entityId, ?int $runId = null, ?string $actor = null, ?string $payloadJson = null): void
{
    $stmt = $pdo->prepare("INSERT INTO events (event_type, entity_type, entity_id, run_id, actor, payload_json, created_at) VALUES (:event_type, :entity_type, :entity_id, :run_id, :actor, :payload_json, :created_at)");
    $stmt->execute([
        ":event_type" => $eventType,
        ":entity_type" => $entityType,
        ":entity_id" => $entityId,
        ":run_id" => $runId,
        ":actor" => $actor ?? "system",
        ":payload_json" => $payloadJson,
        ":created_at" => nowIso(),
    ]);
}

function ensureAllColumns(PDO $pdo): void
{
    try {
        $stmt = $pdo->query('PRAGMA table_info(runs);');
        $runsColumns = $stmt->fetchAll();
    } catch (Throwable) {
        $runsColumns = [];
    }

    $existing = [];
    foreach ($runsColumns as $column) {
        if (is_array($column) && isset($column['name'])) {
            $existing[(string) $column['name']] = true;
        }
    }

    $runsRequired = [
        'run_id' => 'TEXT',
        'phase' => 'TEXT',
        'task_class' => 'TEXT',
        'variant' => 'TEXT',
        'input_tokens' => 'INTEGER',
        'output_tokens' => 'INTEGER',
        'cost' => 'REAL',
        'duration_ms' => 'INTEGER',
        'artifact_json' => 'TEXT',
        'prompt_text' => 'TEXT',
        'prompt_hash' => 'TEXT',
    ];

    foreach ($runsRequired as $name => $type) {
        if (!isset($existing[$name])) {
            $pdo->exec(sprintf('ALTER TABLE runs ADD COLUMN %s %s;', $name, $type));
        }
    }

    $pdo->exec('CREATE INDEX IF NOT EXISTS idx_runs_task_class ON runs(task_class);');
    $pdo->exec('CREATE INDEX IF NOT EXISTS idx_runs_variant ON runs(variant);');

    try {
        $stmt = $pdo->query('PRAGMA table_info(packets);');
        $packetsColumns = $stmt->fetchAll();
    } catch (Throwable) {
        $packetsColumns = [];
    }

    $packetExisting = [];
    foreach ($packetsColumns as $column) {
        if (is_array($column) && isset($column['name'])) {
            $packetExisting[(string) $column['name']] = true;
        }
    }

    try {
        $stmt = $pdo->query("PRAGMA table_info(tasks);");
        $tasksColumns = $stmt->fetchAll();
    } catch (Throwable) {
        $tasksColumns = [];
    }

    $tasksExisting = [];
    foreach ($tasksColumns as $column) {
        if (is_array($column) && isset($column["name"])) {
            $tasksExisting[(string) $column["name"]] = true;
        }
    }

    $tasksRequired = [
        "attempt" => "INTEGER DEFAULT 1",
        "executor_model" => "TEXT",
        "finalize_git" => "INTEGER DEFAULT 0",
        "stop_conditions" => "TEXT",
        "delegate_to_executor" => "INTEGER DEFAULT 1",
    ];

    foreach ($tasksRequired as $name => $type) {
        if (!isset($tasksExisting[$name])) {
            $pdo->exec(sprintf("ALTER TABLE tasks ADD COLUMN %s %s;", $name, $type));
        }
    }

    if (!isset($packetExisting['packet_yaml'])) {
        $pdo->exec('ALTER TABLE packets ADD COLUMN packet_yaml TEXT;');
    }
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
    $rawYaml = file_get_contents($packetPath);
    if ($rawYaml === false) {
        throw new RuntimeException('Unable to read packet: ' . $packetPath);
    }

    try {
        $packet = Yaml::parse($rawYaml);
    } catch (ParseException $e) {
        throw new RuntimeException('Packet YAML parse error: ' . $e->getMessage());
    }

    if (!is_array($packet)) {
        throw new RuntimeException('Packet YAML root must be a map');
    }

    $taskRef = is_array($packet['task_ref'] ?? null) ? $packet['task_ref'] : [];
    $policy = is_array($packet['execution_policy'] ?? null) ? $packet['execution_policy'] : [];
    $scope = is_array($packet['scope'] ?? null) ? $packet['scope'] : [];
    $acceptance = is_array($packet['acceptance_criteria'] ?? null) ? $packet['acceptance_criteria'] : [];
    $verification = is_array($packet['verification'] ?? null) ? $packet['verification'] : [];
    $docList = is_array($packet['doc_allow_list'] ?? null) ? $packet['doc_allow_list'] : [];
    $codeTargets = is_array($packet['code_targets'] ?? null) ? $packet['code_targets'] : [];
    $stopConditions = is_array($packet['stop_conditions'] ?? null) ? $packet['stop_conditions'] : [];

    return [
        'packet_id' => normalizeScalar($taskRef['packet_id'] ?? null) ?? 'packet',
        'phase' => normalizeScalar($taskRef['phase'] ?? null),
        'last_attempt' => (int) (normalizeScalar($taskRef['attempt'] ?? null) ?? '0'),
        'parent_task_id' => normalizeScalar($taskRef['parent_packet_id'] ?? null),
        'executor_model' => normalizeScalar($taskRef['executor_model'] ?? null),
        'task_class' => normalizeScalar($policy['task_class'] ?? null),
        'risk_level' => normalizeScalar($policy['risk_level'] ?? null),
        'summary' => normalizeScalar($packet['summary'] ?? null),
        'scope_in' => json_encode($scope['in'] ?? [], JSON_UNESCAPED_SLASHES),
        'scope_out' => json_encode($scope['out'] ?? [], JSON_UNESCAPED_SLASHES),
        'file_targets' => json_encode($codeTargets, JSON_UNESCAPED_SLASHES),
        'acceptance_criteria' => json_encode($acceptance, JSON_UNESCAPED_SLASHES),
        'verification' => json_encode(isset($verification['commands']) ? $verification['commands'] : [], JSON_UNESCAPED_SLASHES),
        'doc_allow_list' => json_encode($docList, JSON_UNESCAPED_SLASHES),
        'finalize_git' => isset($policy['finalize_git']) && $policy['finalize_git'] ? 1 : 0,
        'delegate_to_executor' => !(isset($policy['delegate_to_executor']) && $policy['delegate_to_executor'] === false) ? 1 : 0,
        'stop_conditions' => json_encode($stopConditions, JSON_UNESCAPED_SLASHES),
        'packet_yaml' => $rawYaml,
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
INSERT INTO packets (packet_id, phase, task_class, risk_level, summary, last_attempt, packet_yaml, updated_at)
VALUES (:packet_id, :phase, :task_class, :risk_level, :summary, :last_attempt, :packet_yaml, :updated_at)
ON CONFLICT(packet_id) DO UPDATE SET
  phase = COALESCE(excluded.phase, packets.phase),
  task_class = COALESCE(excluded.task_class, packets.task_class),
  risk_level = COALESCE(excluded.risk_level, packets.risk_level),
  summary = COALESCE(excluded.summary, packets.summary),
  packet_yaml = COALESCE(excluded.packet_yaml, packets.packet_yaml),
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
        ':packet_yaml' => $packet['packet_yaml'] ?? null,
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
    artifact_path, session_id, transport, issues_json, prompt_text, prompt_hash, created_at
) VALUES (
  (SELECT id FROM runs WHERE artifact_path = :artifact_path),
    :run_id, :packet_id, :phase, :task_class, :attempt, :model, :variant, :provider, :status, :failure_type,
    :input_tokens, :output_tokens, :cost, :duration_ms,
    :artifact_path, :session_id, :transport, :issues_json, :prompt_text, :prompt_hash, :created_at
);
SQL
    );

    $model = $validation['executor_model'] ?? null;
        $provider = normalizeScalar($artifact['provider'] ?? null);
        $variant = normalizeScalar($artifact['variant'] ?? null);
        $metrics = extractRunMetrics($artifact);

    $promptText = normalizeScalar($artifact['prompt'] ?? null);
    $promptHash = null;
    if ($promptText !== null) {
        $promptHash = sha1($promptText);
    } elseif ($packetPath !== null && is_file($packetPath)) {
        $content = file_get_contents($packetPath);
        if ($content !== false) {
            $promptText = $content;
            $promptHash = sha1($content);
        }
    }

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
                ':prompt_text' => $promptText,
                ':prompt_hash' => $promptHash,
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
    $packetID = $result['packet_id'] ?? 'packet';
    emitEvent($pdo, 'PACKET_EXECUTED', 'task', $packetID, null, 'system', json_encode(['artifact' => $artifactPath, 'status' => $result['status']], JSON_UNESCAPED_SLASHES));
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
    $resolvedPacketID = $result['packet_id'] ?? $packetID ?? 'packet';
    emitEvent($pdo, 'PACKET_EXECUTED', 'task', $resolvedPacketID, null, 'system', json_encode(['artifact' => $path, 'status' => $result['status']], JSON_UNESCAPED_SLASHES));
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
    artifact_path, session_id, transport, prompt_text, prompt_hash, created_at
)
VALUES (
    :run_id, :packet_id, :phase, :task_class, :attempt, :model, :variant, :provider,
    :status, :failure_type, :input_tokens, :output_tokens, :cost, :duration_ms,
    :artifact_path, :session_id, :transport, :prompt_text, :prompt_hash, :created_at
);
SQL
    );

    $promptHash = null;
    if ($packetPath !== null && is_file($packetPath)) {
        $content = file_get_contents($packetPath);
        if ($content !== false) {
            $promptHash = sha1($content);
        }
    }

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
        ':prompt_text' => null,
        ':prompt_hash' => $promptHash,
        ':created_at' => nowIso(),
    ]);

    emitEvent($pdo, 'PACKET_EXECUTION_FAILED', 'task', $packetID, null, 'system', json_encode(['failure_type' => $failureType, 'attempt' => $attempt], JSON_UNESCAPED_SLASHES));

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

function taskCreateCommand(PDO $pdo, array $args): void
{
    $taskID = normalizeScalar($args['task-id'] ?? null);
    $phase = normalizeScalar($args['phase'] ?? null);
    $summary = normalizeScalar($args['summary'] ?? null);

    if ($taskID === null || $phase === null || $summary === null) {
        throw new RuntimeException('--task-id, --phase, and --summary are required');
    }

    $stmt = $pdo->prepare(<<<SQL
INSERT INTO tasks (task_id, phase, summary, scope_in, scope_out, file_targets, acceptance_criteria, verification, doc_allow_list, parent_task_id, attempt, executor_model, finalize_git, stop_conditions, delegate_to_executor, task_class, risk_level, priority, created_at, updated_at)
VALUES (:task_id, :phase, :summary, :scope_in, :scope_out, :file_targets, :acceptance_criteria, :verification, :doc_allow_list, :parent_task_id, :attempt, :executor_model, :finalize_git, :stop_conditions, :delegate_to_executor, :task_class, :risk_level, :priority, :created_at, :updated_at)
ON CONFLICT(task_id) DO UPDATE SET
  phase = excluded.phase,
  summary = excluded.summary,
  scope_in = COALESCE(excluded.scope_in, tasks.scope_in),
  scope_out = COALESCE(excluded.scope_out, tasks.scope_out),
  file_targets = COALESCE(excluded.file_targets, tasks.file_targets),
  acceptance_criteria = COALESCE(excluded.acceptance_criteria, tasks.acceptance_criteria),
  verification = COALESCE(excluded.verification, tasks.verification),
  doc_allow_list = COALESCE(excluded.doc_allow_list, tasks.doc_allow_list),
  parent_task_id = COALESCE(excluded.parent_task_id, tasks.parent_task_id),
  attempt = COALESCE(excluded.attempt, tasks.attempt),
  executor_model = COALESCE(excluded.executor_model, tasks.executor_model),
  finalize_git = COALESCE(excluded.finalize_git, tasks.finalize_git),
  stop_conditions = COALESCE(excluded.stop_conditions, tasks.stop_conditions),
  delegate_to_executor = COALESCE(excluded.delegate_to_executor, tasks.delegate_to_executor),
  task_class = COALESCE(excluded.task_class, tasks.task_class),
  risk_level = COALESCE(excluded.risk_level, tasks.risk_level),
  priority = COALESCE(excluded.priority, tasks.priority),
  updated_at = excluded.updated_at;
SQL
    );

    $priority = is_numeric($args['priority'] ?? null) ? (int) $args['priority'] : 0;

    $stmt->execute([
        ':task_id' => $taskID,
        ':phase' => $phase,
        ':summary' => $summary,
        ':scope_in' => normalizeScalar($args['scope-in'] ?? null),
        ':scope_out' => normalizeScalar($args['scope-out'] ?? null),
        ':file_targets' => normalizeScalar($args['file-targets'] ?? null),
        ':acceptance_criteria' => normalizeScalar($args['acceptance-criteria'] ?? null),
        ':verification' => normalizeScalar($args['verification'] ?? null),
        ':doc_allow_list' => normalizeScalar($args['doc-allow-list'] ?? null),
        ':parent_task_id' => normalizeScalar($args['parent-task-id'] ?? null),
        ':attempt' => is_numeric($args['attempt'] ?? null) ? (int) $args['attempt'] : 1,
        ':executor_model' => normalizeScalar($args['executor-model'] ?? null),
        ':finalize_git' => in_array(strtolower((string) ($args['finalize-git'] ?? '')), ['1', 'true', 'yes', 'on']) ? 1 : 0,
        ':stop_conditions' => normalizeScalar($args['stop-conditions'] ?? null),
        ':delegate_to_executor' => in_array(strtolower((string) ($args['delegate-to-executor'] ?? 'true')), ['0', 'false', 'no', 'off']) ? 0 : 1,
        ':task_class' => normalizeScalar($args['task-class'] ?? null),
        ':risk_level' => normalizeScalar($args['risk-level'] ?? null),
        ':priority' => $priority,
        ':created_at' => nowIso(),
        ':updated_at' => nowIso(),
    ]);

    emitEvent($pdo, 'TASK_CREATED', 'task', $taskID, null, 'system', json_encode(['phase' => $phase, 'summary' => $summary], JSON_UNESCAPED_SLASHES));
    echo json_encode([
        'ok' => true,
        'task_id' => $taskID,
        'db_path' => dbPath(),
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
}

function taskShowCommand(PDO $pdo, array $args): void
{
    $taskID = normalizeScalar($args['task-id'] ?? null);
    if ($taskID === null) {
        throw new RuntimeException('--task-id is required');
    }

    $stmt = $pdo->prepare('SELECT * FROM tasks WHERE task_id = :task_id');
    $stmt->execute([':task_id' => $taskID]);
    $task = $stmt->fetch();

    if (!$task) {
        throw new RuntimeException('Task not found: ' . $taskID);
    }

    echo json_encode(['task' => $task, 'db_path' => dbPath()], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
}

function taskListCommand(PDO $pdo, array $args): void
{
    $phase = normalizeScalar($args['phase'] ?? null);
    $completed = normalizeScalar($args['completed'] ?? null);
    $blocked = normalizeScalar($args['blocked'] ?? null);
    $limitRaw = normalizeScalar($args['limit'] ?? null);
    $limit = $limitRaw !== null ? max(1, (int) $limitRaw) : 50;

    $where = [];
    $params = [];

    if ($phase !== null) {
        $where[] = 'phase = :phase';
        $params[':phase'] = $phase;
    }
    if ($completed !== null) {
        $where[] = 'completed = :completed';
        $params[':completed'] = (int) $completed;
    }
    if ($blocked !== null) {
        $where[] = 'blocked = :blocked';
        $params[':blocked'] = (int) $blocked;
    }

    $sql = 'SELECT * FROM tasks';
    if (count($where) > 0) {
        $sql .= ' WHERE ' . implode(' AND ', $where);
    }
    $sql .= ' ORDER BY priority DESC, created_at DESC LIMIT :limit';

    $stmt = $pdo->prepare($sql);
    foreach ($params as $key => $value) {
        $stmt->bindValue($key, $value);
    }
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->execute();

    echo json_encode([
        'tasks' => $stmt->fetchAll(),
        'db_path' => dbPath(),
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
}

function taskCompleteCommand(PDO $pdo, array $args): void
{
    $taskID = normalizeScalar($args['task-id'] ?? null);
    if ($taskID === null) {
        throw new RuntimeException('--task-id is required');
    }

    $stmt = $pdo->prepare('UPDATE tasks SET completed = 1, completed_at = :completed_at, blocked = 0, blocked_reason = NULL, updated_at = :updated_at WHERE task_id = :task_id');
    $stmt->execute([
        ':task_id' => $taskID,
        ':completed_at' => nowIso(),
        ':updated_at' => nowIso(),
    ]);

    if ($stmt->rowCount() === 0) {
        throw new RuntimeException('Task not found: ' . $taskID);
    }

    emitEvent($pdo, 'TASK_COMPLETED', 'task', $taskID, null, 'system', null);
    echo json_encode([
        'ok' => true,
        'task_id' => $taskID,
        'completed' => true,
        'db_path' => dbPath(),
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
}

function taskBlockCommand(PDO $pdo, array $args): void
{
    $taskID = normalizeScalar($args['task-id'] ?? null);
    $reason = normalizeScalar($args['reason'] ?? null);

    if ($taskID === null) {
        throw new RuntimeException('--task-id is required');
    }
    if ($reason === null) {
        throw new RuntimeException('--reason is required');
    }

    $stmt = $pdo->prepare('UPDATE tasks SET blocked = 1, blocked_reason = :reason, updated_at = :updated_at WHERE task_id = :task_id');
    $stmt->execute([
        ':task_id' => $taskID,
        ':reason' => $reason,
        ':updated_at' => nowIso(),
    ]);

    if ($stmt->rowCount() === 0) {
        throw new RuntimeException('Task not found: ' . $taskID);
    }

    emitEvent($pdo, 'TASK_BLOCKED', 'task', $taskID, null, 'system', json_encode(['reason' => $reason], JSON_UNESCAPED_SLASHES));
    echo json_encode([
        'ok' => true,
        'task_id' => $taskID,
        'blocked' => true,
        'reason' => $reason,
        'db_path' => dbPath(),
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
}

function taskUnblockCommand(PDO $pdo, array $args): void
{
    $taskID = normalizeScalar($args['task-id'] ?? null);
    if ($taskID === null) {
        throw new RuntimeException('--task-id is required');
    }

    $stmt = $pdo->prepare('UPDATE tasks SET blocked = 0, blocked_reason = NULL, updated_at = :updated_at WHERE task_id = :task_id');
    $stmt->execute([
        ':task_id' => $taskID,
        ':updated_at' => nowIso(),
    ]);

    if ($stmt->rowCount() === 0) {
        throw new RuntimeException('Task not found: ' . $taskID);
    }

    emitEvent($pdo, 'TASK_UNBLOCKED', 'task', $taskID, null, 'system', null);
    echo json_encode([
        'ok' => true,
        'task_id' => $taskID,
        'blocked' => false,
        'db_path' => dbPath(),
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
}

function taskIngestPacketCommand(PDO $pdo, array $args): void
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

    $stmt = $pdo->prepare(<<<SQL
INSERT INTO tasks (task_id, phase, summary, scope_in, scope_out, file_targets, acceptance_criteria, verification, doc_allow_list, parent_task_id, attempt, executor_model, finalize_git, stop_conditions, delegate_to_executor, task_class, risk_level, priority, created_at, updated_at)
VALUES (:task_id, :phase, :summary, :scope_in, :scope_out, :file_targets, :acceptance_criteria, :verification, :doc_allow_list, :parent_task_id, :attempt, :executor_model, :finalize_git, :stop_conditions, :delegate_to_executor, :task_class, :risk_level, 0, :created_at, :updated_at)
ON CONFLICT(task_id) DO UPDATE SET
  phase = excluded.phase,
  summary = excluded.summary,
  scope_in = COALESCE(excluded.scope_in, tasks.scope_in),
  scope_out = COALESCE(excluded.scope_out, tasks.scope_out),
  file_targets = COALESCE(excluded.file_targets, tasks.file_targets),
  acceptance_criteria = COALESCE(excluded.acceptance_criteria, tasks.acceptance_criteria),
  verification = COALESCE(excluded.verification, tasks.verification),
  doc_allow_list = COALESCE(excluded.doc_allow_list, tasks.doc_allow_list),
  parent_task_id = COALESCE(excluded.parent_task_id, tasks.parent_task_id),
  attempt = COALESCE(excluded.attempt, tasks.attempt),
  executor_model = COALESCE(excluded.executor_model, tasks.executor_model),
  finalize_git = COALESCE(excluded.finalize_git, tasks.finalize_git),
  stop_conditions = COALESCE(excluded.stop_conditions, tasks.stop_conditions),
  delegate_to_executor = COALESCE(excluded.delegate_to_executor, tasks.delegate_to_executor),
  task_class = COALESCE(excluded.task_class, tasks.task_class),
  risk_level = COALESCE(excluded.risk_level, tasks.risk_level),
  updated_at = excluded.updated_at;
SQL
    );

    $stmt->execute([
        ':task_id' => $packet['packet_id'],
        ':phase' => $packet['phase'],
        ':summary' => $packet['summary'] ?? '',
        ':scope_in' => $packet['scope_in'] ?? null,
        ':scope_out' => $packet['scope_out'] ?? null,
        ':file_targets' => $packet['file_targets'] ?? null,
        ':acceptance_criteria' => $packet['acceptance_criteria'] ?? null,
        ':verification' => $packet['verification'] ?? null,
        ':doc_allow_list' => $packet['doc_allow_list'] ?? null,
        ':parent_task_id' => $packet['parent_task_id'] ?? null,
        ':attempt' => max(1, (int) ($packet['last_attempt'] ?? 1)),
        ':executor_model' => $packet['executor_model'] ?? null,
        ':finalize_git' => (int) ($packet['finalize_git'] ?? 0),
        ':stop_conditions' => $packet['stop_conditions'] ?? null,
        ':delegate_to_executor' => (int) ($packet['delegate_to_executor'] ?? 1),
        ':task_class' => $packet['task_class'],
        ':risk_level' => $packet['risk_level'],
        ':created_at' => nowIso(),
        ':updated_at' => nowIso(),
    ]);

    emitEvent($pdo, 'TASK_CREATED', 'task', $packet['packet_id'], null, 'system', json_encode(['phase' => $packet['phase'], 'source' => 'ingest-packet'], JSON_UNESCAPED_SLASHES));
    echo json_encode([
        'ok' => true,
        'packet_id' => $packet['packet_id'],
        'task_id' => $packet['packet_id'],
        'db_path' => dbPath(),
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
}

function planListCommand(PDO $pdo, array $args): void
{
    $status = normalizeScalar($args['status'] ?? null);
    $sql = 'SELECT id, plan_key, title, status, updated_at FROM phase_plans';
    $params = [];

    if ($status !== null) {
        $sql .= ' WHERE status = :status';
        $params[':status'] = $status;
    }
    $sql .= ' ORDER BY plan_key ASC';

    $stmt = $pdo->prepare($sql);
    foreach ($params as $key => $value) {
        $stmt->bindValue($key, $value);
    }
    $stmt->execute();

    echo json_encode([
        'plans' => $stmt->fetchAll(),
        'db_path' => dbPath(),
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
}

function planShowCommand(PDO $pdo, array $args): void
{
    $planKey = normalizeScalar($args['plan-key'] ?? null);
    if ($planKey === null) {
        throw new RuntimeException('--plan-key is required');
    }

    $stmt = $pdo->prepare('SELECT * FROM phase_plans WHERE plan_key = :plan_key');
    $stmt->execute([':plan_key' => $planKey]);
    $plan = $stmt->fetch();

    if (!$plan) {
        throw new RuntimeException('Plan not found: ' . $planKey);
    }

    echo json_encode(['plan' => $plan, 'db_path' => dbPath()], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
}

function planIngestCommand(PDO $pdo, array $args): void
{
    $planKey = normalizeScalar($args['plan-key'] ?? null);
    $title = normalizeScalar($args['title'] ?? null);
    $filePath = normalizeScalar($args['file'] ?? null);

    if ($planKey === null || $title === null || $filePath === null) {
        throw new RuntimeException('--plan-key, --title, and --file are required');
    }

    $resolved = resolvePath($filePath);
    if (!is_file($resolved)) {
        throw new RuntimeException('File not found: ' . $resolved);
    }

    $content = file_get_contents($resolved);
    if ($content === false) {
        throw new RuntimeException('Unable to read file: ' . $resolved);
    }

    $stmt = $pdo->prepare(<<<SQL
INSERT INTO phase_plans (plan_key, title, content, status, updated_at)
VALUES (:plan_key, :title, :content, 'active', :updated_at)
ON CONFLICT(plan_key) DO UPDATE SET
  title = excluded.title,
  content = excluded.content,
  updated_at = excluded.updated_at;
SQL
    );

    $stmt->execute([
        ':plan_key' => $planKey,
        ':title' => $title,
        ':content' => $content,
        ':updated_at' => nowIso(),
    ]);

    echo json_encode([
        'ok' => true,
        'plan_key' => $planKey,
        'db_path' => dbPath(),
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
}

function refListCommand(PDO $pdo, array $args): void
{
    $stmt = $pdo->query('SELECT id, doc_key, title, updated_at FROM reference_docs ORDER BY doc_key ASC');
    echo json_encode([
        'docs' => $stmt->fetchAll(),
        'db_path' => dbPath(),
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
}

function refShowCommand(PDO $pdo, array $args): void
{
    $docKey = normalizeScalar($args['doc-key'] ?? null);
    if ($docKey === null) {
        throw new RuntimeException('--doc-key is required');
    }

    $stmt = $pdo->prepare('SELECT * FROM reference_docs WHERE doc_key = :doc_key');
    $stmt->execute([':doc_key' => $docKey]);
    $doc = $stmt->fetch();

    if (!$doc) {
        throw new RuntimeException('Reference doc not found: ' . $docKey);
    }

    echo json_encode(['doc' => $doc, 'db_path' => dbPath()], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
}

function refIngestCommand(PDO $pdo, array $args): void
{
    $docKey = normalizeScalar($args['doc-key'] ?? null);
    $title = normalizeScalar($args['title'] ?? null);
    $filePath = normalizeScalar($args['file'] ?? null);

    if ($docKey === null || $title === null || $filePath === null) {
        throw new RuntimeException('--doc-key, --title, and --file are required');
    }

    $resolved = resolvePath($filePath);
    if (!is_file($resolved)) {
        throw new RuntimeException('File not found: ' . $resolved);
    }

    $content = file_get_contents($resolved);
    if ($content === false) {
        throw new RuntimeException('Unable to read file: ' . $resolved);
    }

    $stmt = $pdo->prepare(<<<SQL
INSERT INTO reference_docs (doc_key, title, content, updated_at)
VALUES (:doc_key, :title, :content, :updated_at)
ON CONFLICT(doc_key) DO UPDATE SET
  title = excluded.title,
  content = excluded.content,
  updated_at = excluded.updated_at;
SQL
    );

    $stmt->execute([
        ':doc_key' => $docKey,
        ':title' => $title,
        ':content' => $content,
        ':updated_at' => nowIso(),
    ]);

    echo json_encode([
        'ok' => true,
        'doc_key' => $docKey,
        'db_path' => dbPath(),
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
}

function ingestAllCommand(PDO $pdo, array $args): void
{
    $dryRun = isset($args['dry-run']);
    $root = getProjectRoot();
    $base = $root . '/.opencode/DEVELOPMENT_DOCS';

    $results = [
        'packets' => 0,
        'plans' => 0,
        'refs' => 0,
        'history' => 0,
        'errors' => [],
    ];

    $packetFiles = array_merge(
        glob($base . '/execution/packet*.yaml') ?: [],
        glob($base . '/execution/broker-validation/packet-*.yaml') ?: [],
    );

    foreach ($packetFiles as $file) {
        if ($dryRun) {
            $results['packets'] += 1;
            continue;
        }
        try {
            $packet = parsePacketFile($file);
            upsertPacket($pdo, $packet);

            $stmt = $pdo->prepare(<<<SQL
INSERT INTO tasks (task_id, phase, summary, scope_in, scope_out, file_targets, acceptance_criteria, verification, doc_allow_list, parent_task_id, attempt, executor_model, finalize_git, stop_conditions, delegate_to_executor, task_class, risk_level, priority, created_at, updated_at)
VALUES (:task_id, :phase, :summary, :scope_in, :scope_out, :file_targets, :acceptance_criteria, :verification, :doc_allow_list, :parent_task_id, :attempt, :executor_model, :finalize_git, :stop_conditions, :delegate_to_executor, :task_class, :risk_level, 0, :created_at, :updated_at)
ON CONFLICT(task_id) DO UPDATE SET
  phase = excluded.phase,
  summary = excluded.summary,
  scope_in = COALESCE(excluded.scope_in, tasks.scope_in),
  scope_out = COALESCE(excluded.scope_out, tasks.scope_out),
  file_targets = COALESCE(excluded.file_targets, tasks.file_targets),
  acceptance_criteria = COALESCE(excluded.acceptance_criteria, tasks.acceptance_criteria),
  verification = COALESCE(excluded.verification, tasks.verification),
  doc_allow_list = COALESCE(excluded.doc_allow_list, tasks.doc_allow_list),
  task_class = COALESCE(excluded.task_class, tasks.task_class),
  risk_level = COALESCE(excluded.risk_level, tasks.risk_level),
  updated_at = excluded.updated_at;
SQL
            );
            $stmt->execute([
                ':task_id' => $packet['packet_id'],
                ':phase' => $packet['phase'],
                ':summary' => $packet['summary'] ?? '',
                ':scope_in' => $packet['scope_in'] ?? null,
                ':scope_out' => $packet['scope_out'] ?? null,
                ':file_targets' => $packet['file_targets'] ?? null,
                ':acceptance_criteria' => $packet['acceptance_criteria'] ?? null,
                ':verification' => $packet['verification'] ?? null,
                ':doc_allow_list' => $packet['doc_allow_list'] ?? null,
                ':task_class' => $packet['task_class'],
                ':risk_level' => $packet['risk_level'],
                ':created_at' => nowIso(),
                ':updated_at' => nowIso(),
            ]);
            $results['packets'] += 1;
        } catch (Throwable $e) {
            $results['errors'][] = ['file' => $file, 'error' => $e->getMessage()];
        }
    }

    $planFiles = glob($base . '/plans/*.md') ?: [];
    foreach ($planFiles as $file) {
        $key = strtolower(basename($file, '.md'));
        $title = basename($file, '.md');
        if ($dryRun) {
            $results['plans'] += 1;
            continue;
        }
        try {
            $content = file_get_contents($file);
            if ($content === false) {
                throw new RuntimeException('Unable to read file');
            }
            $stmt = $pdo->prepare(<<<SQL
INSERT INTO phase_plans (plan_key, title, content, status, updated_at)
VALUES (:key, :title, :content, 'active', :updated_at)
ON CONFLICT(plan_key) DO UPDATE SET title = excluded.title, content = excluded.content, updated_at = excluded.updated_at;
SQL
            );
            $stmt->execute([':key' => $key, ':title' => $title, ':content' => $content, ':updated_at' => nowIso()]);
            $results['plans'] += 1;
        } catch (Throwable $e) {
            $results['errors'][] = ['file' => $file, 'error' => $e->getMessage()];
        }
    }

    $refFiles = glob($base . '/reference/*.md') ?: [];
    foreach ($refFiles as $file) {
        $key = strtolower(basename($file, '.md'));
        $title = basename($file, '.md');
        if ($dryRun) {
            $results['refs'] += 1;
            continue;
        }
        try {
            $content = file_get_contents($file);
            if ($content === false) {
                throw new RuntimeException('Unable to read file');
            }
            $stmt = $pdo->prepare(<<<SQL
INSERT INTO reference_docs (doc_key, title, content, updated_at)
VALUES (:key, :title, :content, :updated_at)
ON CONFLICT(doc_key) DO UPDATE SET title = excluded.title, content = excluded.content, updated_at = excluded.updated_at;
SQL
            );
            $stmt->execute([':key' => $key, ':title' => $title, ':content' => $content, ':updated_at' => nowIso()]);
            $results['refs'] += 1;
        } catch (Throwable $e) {
            $results['errors'][] = ['file' => $file, 'error' => $e->getMessage()];
        }
    }

    echo json_encode([
        'ok' => count($results['errors']) === 0,
        'dry_run' => $dryRun,
        'packets' => $results['packets'],
        'plans' => $results['plans'],
        'refs' => $results['refs'],
        'errors' => $results['errors'],
        'db_path' => dbPath(),
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
}

function buildPacketFromTask(PDO $pdo, string $taskID): string
{
    $stmt = $pdo->prepare('SELECT * FROM tasks WHERE task_id = :task_id');
    $stmt->execute([':task_id' => $taskID]);
    $task = $stmt->fetch();

    if (!$task) {
        throw new RuntimeException('Task not found: ' . $taskID);
    }

    $scopeIn = json_decode($task['scope_in'] ?? '[]', true) ?: [];
    $scopeOut = json_decode($task['scope_out'] ?? '[]', true) ?: [];
    $acceptance = json_decode($task['acceptance_criteria'] ?? '[]', true) ?: [];
    $verification = json_decode($task['verification'] ?? '[]', true) ?: [];
    $fileTargets = json_decode($task['file_targets'] ?? '[]', true) ?: [];
    $docList = json_decode($task['doc_allow_list'] ?? '[]', true) ?: [];
    $stopConditions = json_decode($task['stop_conditions'] ?? '[]', true) ?: [];

    $status = $task['completed'] ? 'completed' : ($task['blocked'] ? 'blocked' : 'pending');

    $packet = [
        'schema_version' => 1,
        'status' => $status,
        'task_ref' => array_filter([
            'packet_id' => $taskID,
            'phase' => $task['phase'] ?? 'UNKNOWN',
            'attempt' => max(1, (int) ($task['attempt'] ?? 1)),
            'executor_model' => $task['executor_model'] ?? null,
            'parent_packet_id' => $task['parent_task_id'] ?? null,
        ], fn ($v) => $v !== null),
        'summary' => $task['summary'],
        'execution_policy' => [
            'task_class' => $task['task_class'] ?? 'feature',
            'risk_level' => $task['risk_level'] ?? 'medium',
            'finalize_git' => (bool) ($task['finalize_git'] ?? 0),
            'delegate_to_executor' => (bool) ($task['delegate_to_executor'] ?? 1),
        ],
        'scope' => [
            'in' => $scopeIn,
            'out' => $scopeOut,
        ],
        'doc_allow_list' => $docList,
        'code_targets' => $fileTargets,
        'acceptance_criteria' => $acceptance,
        'verification' => ['commands' => $verification],
        'stop_conditions' => $stopConditions,
    ];

    return Yaml::dump($packet, 4, 2, Yaml::DUMP_EMPTY_ARRAY_AS_SEQUENCE);
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
    ensureAllColumns($pdo);

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

        case 'task:create':
            taskCreateCommand($pdo, $args);
            break;

        case 'task:show':
            taskShowCommand($pdo, $args);
            break;

        case 'task:list':
            taskListCommand($pdo, $args);
            break;

        case 'task:complete':
            taskCompleteCommand($pdo, $args);
            break;

        case 'task:block':
            taskBlockCommand($pdo, $args);
            break;

        case 'task:unblock':
            taskUnblockCommand($pdo, $args);
            break;

        case 'task:ingest-packet':
            taskIngestPacketCommand($pdo, $args);
            break;

        case 'build-packet':
            $requestedTaskID = normalizeScalar($args['task-id'] ?? null);
            if ($requestedTaskID === null) {
                throw new RuntimeException('--task-id is required');
            }
            echo buildPacketFromTask($pdo, $requestedTaskID) . PHP_EOL;
            break;

        case 'plan:list':
            planListCommand($pdo, $args);
            break;

        case 'plan:show':
            planShowCommand($pdo, $args);
            break;

        case 'plan:ingest':
            planIngestCommand($pdo, $args);
            break;

        case 'ref:list':
            refListCommand($pdo, $args);
            break;

        case 'ref:show':
            refShowCommand($pdo, $args);
            break;

        case 'ref:ingest':
            refIngestCommand($pdo, $args);
            break;

        case 'ingest-all':
            ingestAllCommand($pdo, $args);
            break;

        default:
            throw new RuntimeException('Unknown command: ' . $command);
    }
} catch (Throwable $e) {
    fwrite(STDERR, $e->getMessage() . PHP_EOL);
    exit(1);
}
