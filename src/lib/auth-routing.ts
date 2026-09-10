import type { AuthUser } from "@/lib/api/auth";

/**
 * Which screen an account's status entitles it to.
 *
 * The two layouts ask the same question from opposite sides — the dashboard
 * asks "may this user stay?", the auth group asks "should this user be sent
 * into the app?" — and answering it in two places is how they drift into
 * bouncing a user between them. One function, one answer.
 */
export type AuthDestination = "/creatives" | "/pending" | "/blocked";

export function destinationFor(user: Pick<AuthUser, "status">): AuthDestination {
  switch (user.status) {
    case "approved":
      return "/creatives";
    case "blocked":
      return "/blocked";
    default:
      // Anything unrecognised is treated as pending, matching the backend:
      // an unknown status must never read as approved.
      return "/pending";
  }
}

/** Pages an unapproved user is allowed to sit on. */
export const STATUS_PAGES: readonly string[] = ["/pending", "/blocked"];
