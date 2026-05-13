import { createAuthClient } from "@cf-auth/client";

export const auth = createAuthClient({ basePath: "/auth" });

export const authForms = `
<form id="signup">
  <input name="email" type="email" placeholder="email@example.com">
  <input name="password" type="password" placeholder="Password">
  <button type="submit">Sign up</button>
</form>
<form id="login">
  <input name="identifier" placeholder="Email or username">
  <input name="password" type="password" placeholder="Password">
  <button type="submit">Sign in</button>
</form>`;
