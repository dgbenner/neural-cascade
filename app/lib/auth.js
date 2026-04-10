import { cookies } from "next/headers";

export const AUTH_COOKIE = "nc_auth";

export async function isAuthed() {
  const store = await cookies();
  const token = store.get(AUTH_COOKIE)?.value;
  return Boolean(token) && token === process.env.ACCESS_PASSWORD;
}
