/**
 * An expected, user-facing failure ("not enough roasted coffee", "invalid
 * postal code"). Server actions show its message; other errors are bugs and
 * get a generic message.
 */
export class UserError extends Error {
  constructor(
    message: string,
    public fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = "UserError";
  }
}
