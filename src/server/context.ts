import type { Mailer } from "./adapters/mailer";
import type { Repo } from "./repo/types";

/**
 * Everything a service needs from the outside world. The app builds it with
 * real adapters (see app-context.ts); tests pass in-memory fakes and a fixed
 * clock. This is plain dependency injection, no framework needed.
 */
export interface Ctx {
  repo: Repo;
  mailer: Mailer;
  now: () => Date;
  appUrl: string;
}
