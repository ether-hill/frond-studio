import { NextResponse } from "next/server";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Newsletter signup endpoint. Validates the email and accepts it. There is no
 * email provider wired up yet — connect one here (Resend / Mailchimp /
 * Buttondown / a Marketplace store) to actually persist or forward the address.
 * Until then this just logs and returns ok so the footer form works end-to-end.
 */
export async function POST(req: Request) {
  let email = "";
  try {
    const body = (await req.json()) as { email?: string };
    email = (body.email || "").trim().toLowerCase();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  // TODO: forward to a real email provider / store.
  console.log("[subscribe]", email);

  return NextResponse.json({ ok: true });
}
