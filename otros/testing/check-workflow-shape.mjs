#!/usr/bin/env node
/** Inspecciona la forma exacta de un workflow devuelto por el backend. */

const API_BASE = "https://api-service.gruponavitel.com";
const API_URL = `${API_BASE}/api/v1`;

async function main() {
  const login = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "Admin1432!" }),
  });
  const { data } = await login.json();
  const token = data?.accessToken || data?.token;

  const list = await fetch(`${API_URL}/master/workflows?pageSize=5`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const lj = await list.json();
  const arr = Array.isArray(lj) ? lj : (lj.data || lj.items || []);
  console.log("Total workflows:", arr.length);
  if (!arr.length) return;
  const first = arr[0];
  console.log("\n══ Primer workflow (LISTA) ══");
  console.log("Keys:", Object.keys(first));
  console.log("\nactions field (raw):");
  console.log(JSON.stringify(first.actions, null, 2));
  console.log("\nsteps field (raw):");
  console.log(JSON.stringify(first.steps, null, 2));

  const det = await fetch(`${API_URL}/master/workflows/${first.id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const dj = await det.json();
  console.log("\n══ Detalle (GET /:id) ══");
  console.log("Top-level keys:", Object.keys(dj));
  const inner = dj.data ?? dj;
  console.log("Inner keys:", Object.keys(inner));
  console.log("\nactions:");
  console.log(JSON.stringify(inner.actions, null, 2));
  console.log("\nsteps:");
  console.log(JSON.stringify(inner.steps, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
