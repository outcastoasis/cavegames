const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function testAPI() {
  const res = await fetch(`${BASE_URL}/test`);
  if (!res.ok) throw new Error("Fehler beim API-Test");
  return res.json();
}
