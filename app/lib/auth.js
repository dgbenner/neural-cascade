import { cookies } from "next/headers";

export const AUTH_COOKIE = "nc_auth";

export async function isAuthed() {
  const store = await cookies();
  const token = store.get(AUTH_COOKIE)?.value;
  if (!token) return false;
  const passwords = (process.env.ACCESS_PASSWORD || "").split(",").map((p) => p.trim());
  return passwords.includes(token);
}
