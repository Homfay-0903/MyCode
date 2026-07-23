import { createMiddleware } from "hono/factory";
import type { AuthenticatedEnv } from "./require-auth";

// Polar billing has been disabled - always allow requests through
export const requireCreditsBalance = createMiddleware<AuthenticatedEnv>(async (c, next) => {
  await next();
});
