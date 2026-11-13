import { unstable_rethrow } from "next/navigation";
import { UserError } from "./services/errors";

export interface ActionState {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
}

export const idle: ActionState = { ok: false };

/**
 * Wrap a server action body: user-facing errors become a message, and
 * anything unexpected is logged and hidden behind a generic message.
 */
export async function runAction(fn: () => Promise<ActionState | void>): Promise<ActionState> {
  try {
    return (await fn()) ?? { ok: true };
  } catch (err) {
    unstable_rethrow(err); // let redirect()/notFound() through
    if (err instanceof UserError) {
      return { ok: false, message: err.message, fieldErrors: err.fieldErrors };
    }
    console.error(err);
    return { ok: false, message: "Something went wrong. Please try again." };
  }
}
