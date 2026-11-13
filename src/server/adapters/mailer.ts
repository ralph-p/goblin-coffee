import type { ReactElement } from "react";
import { render } from "@react-email/render";
import { nanoid } from "nanoid";
import type { Repo } from "@/server/repo/types";

/**
 * Email port. The dev mailer stores rendered emails in the repo outbox
 * (viewable at /admin/dev/mailbox); the Resend mailer sends for real.
 */
export interface Mailer {
  send(msg: { to: string; subject: string; react: ReactElement }): Promise<void>;
}

export function devMailer(repo: Repo): Mailer {
  return {
    async send({ to, subject, react }) {
      const html = await render(react);
      await repo.outbox.insert({ id: nanoid(10), to, subject, html, at: new Date().toISOString() });
      console.info(`[dev-mail] → ${to}: ${subject}`);
    },
  };
}

export function resendMailer(apiKey: string, from: string): Mailer {
  return {
    async send({ to, subject, react }) {
      const { Resend } = await import("resend");
      const { error } = await new Resend(apiKey).emails.send({ from, to, subject, react });
      if (error) throw new Error(`Email send failed: ${error.message}`);
    },
  };
}

/** Collects messages in memory; for tests. */
export function memoryMailer() {
  const sent: { to: string; subject: string }[] = [];
  const mailer: Mailer = {
    async send({ to, subject }) {
      sent.push({ to, subject });
    },
  };
  return { mailer, sent };
}
