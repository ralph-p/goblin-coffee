import "server-only";
import type { ReactElement } from "react";
import { Resend } from "resend";
import { env } from "@/lib/env";

/**
 * Single place emails leave the app, so the provider (Resend today) can be
 * swapped later. React Email templates will live in src/lib/email/templates/.
 */
let resend: Resend | undefined;

export async function sendEmail(opts: {
  to: string;
  subject: string;
  react: ReactElement;
  replyTo?: string;
}) {
  const e = env();
  resend ??= new Resend(e.RESEND_API_KEY);
  const { data, error } = await resend.emails.send({
    from: e.EMAIL_FROM,
    to: opts.to,
    subject: opts.subject,
    react: opts.react,
    replyTo: opts.replyTo,
  });
  if (error) throw new Error(`Email send failed: ${error.message}`);
  return data;
}
