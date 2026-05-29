import { buildClient } from "./common.mjs";

async function main() {
  const client = buildClient();
  const response = await client.request("GET", "/api/model");

  if (!response.ok) {
    console.error(JSON.stringify({
      ok: false,
      endpoint: "/api/model",
      status: response.status,
      error: response.data,
    }, null, 2));
    process.exit(1);
  }

  const models = Array.isArray(response.data)
    ? response.data.map((model) => ({
      id: model.id,
      providerID: model.providerID,
      name: model.name,
      status: model.status,
      enabled: model.enabled,
    }))
    : [];

  console.log(JSON.stringify({
    ok: true,
    count: models.length,
    models,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message || String(error));
  process.exit(1);
});
