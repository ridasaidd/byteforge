import { buildClient } from "./common.mjs";

async function main() {
  const client = buildClient();
  const response = await client.request("GET", "/global/health");

  if (!response.ok) {
    console.error(JSON.stringify({
      ok: false,
      endpoint: "/global/health",
      status: response.status,
      error: response.data,
    }, null, 2));
    process.exit(1);
  }

  console.log(JSON.stringify({
    ok: true,
    baseUrl: client.baseUrl,
    health: response.data,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message || String(error));
  process.exit(1);
});
