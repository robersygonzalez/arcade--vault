import { Resend } from "resend";

const TO_EMAIL = "robersygonzalez@gmail.com";
const FROM_EMAIL = "Arcade Vault <onboarding@resend.dev>";

type ContactPayload = { name: string; email: string; msg: string };
type ContactResponse = { ok: true } | { ok: false; error: string };

export async function POST(request: Request) {
  const { name, email, msg } = (await request.json()) as ContactPayload;

  if (!name || !email || !msg) {
    return Response.json<ContactResponse>(
      { ok: false, error: "Nombre, correo y mensaje son obligatorios." },
      { status: 400 }
    );
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: TO_EMAIL,
    replyTo: email,
    subject: `Nuevo mensaje de ${name} · Arcade Vault`,
    text: msg,
  });

  if (error) {
    return Response.json<ContactResponse>(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  return Response.json<ContactResponse>({ ok: true });
}
