import { appParams } from "@/lib/app-params";

function accessToken() {
  try {
    return (
      appParams.token ||
      window.localStorage.getItem("base44_access_token") ||
      window.localStorage.getItem("token") ||
      ""
    );
  } catch {
    return appParams.token || "";
  }
}

/** Calls a backend function with the user's access token. */
export async function callFunction(name, body = {}) {
  const res = await fetch(`/api/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken()}` },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}
