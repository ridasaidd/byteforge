import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  detectNonCompliance,
  extractRawTextFromV1,
  extractRawTextFromV2,
  extractRawTextForDetection,
  stripCodeFence,
  validateExecutorResponseSchema,
  buildRetryPrompt,
} = require("./common.mjs");

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (!condition) {
    console.error(`FAIL: ${label}`);
    failed += 1;
    return false;
  }
  passed += 1;
  return true;
}

function asV1Raw(text) {
  return { parts: [{ type: "text", text }] };
}

function asV2Raw(text) {
  return { items: [{ type: "assistant", content: [{ type: "text", text }] }] };
}

const COMPLIANT_YAML = [
  "schema_version: 1",
  "status: success",
  "task_ref:",
  "  packet_id: EP-TEST",
  "  phase: PHASE19",
  "  attempt: 1",
  "  executor_model: deepseek-v4-flash",
].join("\n");

console.log("=== detectNonCompliance ===");

let r = detectNonCompliance(COMPLIANT_YAML);
assert(r.nonCompliant === false, "compliant YAML is detected as compliant");
assert(r.reasons.length === 0, "compliant YAML has no reasons");

const LEADING_PROSE = "Here is my response:\n\n" + COMPLIANT_YAML;
r = detectNonCompliance(LEADING_PROSE);
assert(r.nonCompliant === true, "leading prose is detected as non-compliant");
assert(r.reasons.includes("leading_prose"), "leading prose reason is reported");

const FENCED_YAML = "```yaml\n" + COMPLIANT_YAML + "\n```";
r = detectNonCompliance(FENCED_YAML);
assert(r.nonCompliant === true, "fenced YAML is detected as non-compliant");
assert(r.reasons.includes("markdown_fences"), "markdown fences reason is reported");

const TRAILING_PROSE = COMPLIANT_YAML + "\n\nI hope this helps!";
r = detectNonCompliance(TRAILING_PROSE);
assert(r.nonCompliant === true, "trailing prose is detected as non-compliant");
assert(r.reasons.includes("trailing_prose"), "trailing prose reason is reported");

const ALL_THREE = "Here is the plan:\n\n```yaml\n" + COMPLIANT_YAML + "\n```\n\nDone.";
r = detectNonCompliance(ALL_THREE);
assert(r.nonCompliant === true, "all three violations detected");
assert(r.reasons.includes("leading_prose"), "all-three: leading_prose");
assert(r.reasons.includes("markdown_fences"), "all-three: markdown_fences");
assert(r.reasons.includes("trailing_prose"), "all-three: trailing_prose");

const EMPTY = "";
r = detectNonCompliance(EMPTY);
assert(r.nonCompliant === false, "empty text is compliant");

const WHITESPACE_ONLY = "   \n  \n  ";
r = detectNonCompliance(WHITESPACE_ONLY);
assert(r.nonCompliant === false, "whitespace-only text is compliant");

const YAML_WITH_LIST_LAST = [
  "schema_version: 1",
  "status: failed",
  "failure_type: environment_blocker",
  "task_ref:",
  "  packet_id: EP-TEST",
  "  phase: PHASE19",
  "  attempt: 1",
  "  executor_model: deepseek-v4-flash",
  "errors:",
  "  - connection refused",
  "  - timeout",
].join("\n");
r = detectNonCompliance(YAML_WITH_LIST_LAST);
assert(r.nonCompliant === false, "YAML ending with list items is compliant");

const FENCED_NO_LANG = "```\n" + COMPLIANT_YAML + "\n```";
r = detectNonCompliance(FENCED_NO_LANG);
assert(r.nonCompliant === true, "fenced with no language is detected as non-compliant");

console.log("\n=== extractRawTextFromV1 ===");

const v1Text = extractRawTextFromV1(asV1Raw("hello world"));
assert(v1Text === "hello world", "v1 extracts single part text");

const v1Multi = extractRawTextFromV1(asV1Raw("part1\n\npart2"));
assert(v1Multi === "part1\n\npart2", "v1 passes through text unchanged");

const v1Empty = extractRawTextFromV1(null);
assert(v1Empty === "", "v1 returns empty for null input");

console.log("\n=== extractRawTextFromV2 ===");

const v2Text = extractRawTextFromV2(asV2Raw("hello world"));
assert(v2Text === "hello world", "v2 extracts last assistant text");

const v2Empty = extractRawTextFromV2(null);
assert(v2Empty === "", "v2 returns empty for null input");

console.log("\n=== extractRawTextForDetection ===");

const v1Result = { transport: "v1", raw: asV1Raw("test v1") };
assert(extractRawTextForDetection(v1Result) === "test v1", "detection extracts from v1 result");

const v2Result = { transport: "v2", raw: asV2Raw("test v2") };
assert(extractRawTextForDetection(v2Result) === "test v2", "detection extracts from v2 result");

const noRaw = extractRawTextForDetection(null);
assert(noRaw === "", "detection returns empty for null result");

const noRawField = extractRawTextForDetection({ transport: "v1" });
assert(noRawField === "", "detection returns empty for result without raw");

console.log("\n=== buildRetryPrompt ===");

const retryPrompt = buildRetryPrompt("packet: test", "invalid response");
assert(retryPrompt.includes("Your previous response violated the executor contract."), "retry prompt contains violation message");
assert(retryPrompt.includes("Return only the YAML document."), "retry prompt says return only YAML");
assert(retryPrompt.includes("No prose."), "retry prompt says no prose");
assert(retryPrompt.includes("No markdown fences."), "retry prompt says no fences");
assert(retryPrompt.includes("No explanation."), "retry prompt says no explanation");
assert(retryPrompt.includes("Execution packet:"), "retry prompt includes packet");
assert(retryPrompt.includes("packet: test"), "retry prompt includes original packet");
assert(retryPrompt.includes("---BEGIN INVALID RESPONSE---"), "retry prompt includes invalid response start marker");
assert(retryPrompt.includes("invalid response"), "retry prompt includes invalid response content");
assert(retryPrompt.includes("---END INVALID RESPONSE---"), "retry prompt includes invalid response end marker");

console.log("\n=== validateExecutorResponseSchema with non-compliant text ===");

const fencedValid = "```yaml\n" + COMPLIANT_YAML + "\n```";
const v = validateExecutorResponseSchema(fencedValid);
assert(v.valid === true, "fenced valid YAML passes schema validation");
assert(v.status === "success", "fenced valid YAML has correct status");
assert(v.taskRef.packet_id === "EP-TEST", "fenced valid YAML has correct packet_id");

const proseValid = "Here it is:\n\n" + COMPLIANT_YAML + "\n\nHope that works!";
const v2 = validateExecutorResponseSchema(proseValid);
assert(v2.valid === true, "prose-wrapped valid YAML passes schema validation (tolerant)");
assert(v2.status === "success", "prose-wrapped YAML has correct status");

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
if (failed > 0) {
  process.exit(1);
}
