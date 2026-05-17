#!/usr/bin/env node
const API_BASE = "https://api-service.gruponavitel.com";
const login = await fetch(`${API_BASE}/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username: "admin", password: "Admin1432!" }),
});
const lj = await login.json();
const TOKEN = (lj?.data ?? lj)?.accessToken;
console.log("Token len:", TOKEN?.length);
console.log("Token prefix:", TOKEN?.slice(0, 30));

// Probar 1 endpoint de monitoring directo
const r = await fetch(`${API_BASE}/api/v1/monitoring/tracking`, {
  headers: { Authorization: `Bearer ${TOKEN}` },
});
const text = await r.text();
console.log("Status:", r.status);
console.log("Body:", text.slice(0, 300));

// Comparar con un endpoint que sí funciona (master/customers)
const r2 = await fetch(`${API_BASE}/api/v1/master/customers?pageSize=1`, {
  headers: { Authorization: `Bearer ${TOKEN}` },
});
console.log("\nGET /master/customers status:", r2.status);
