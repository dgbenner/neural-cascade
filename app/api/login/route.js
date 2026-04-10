import { cookies } from "next/headers";
import { AUTH_COOKIE } from "../../lib/auth";

export async function POST(request) {
  const { password } = await request.json().catch(() => ({}));
  const expected = process.env.ACCESS_PASSWORD;

  if (!expected) {
    return Response.json(
      { error: "Server missing ACCESS_PASSWORD" },
      { status: 500 }
    );
  }

  if (password !== expected) {
    return Response.json({ error: "Invalid password" }, { status: 401 });
  }

  const store = await cookies();
  store.set({
    name: AUTH_COOKIE,
    value: expected,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return Response.json({ success: true });
}
