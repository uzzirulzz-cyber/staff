export function createInviteToken(organizationId: string): string {
  const nonce =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().replace(/-/g, "")
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  return `${organizationId}.${nonce}`;
}

export function parseInviteToken(token: string): { organizationId: string; nonce: string } | null {
  if (!token) return null;

  const [organizationId, ...rest] = token.split(".");
  const nonce = rest.join(".");

  if (!organizationId || !nonce) return null;

  return { organizationId, nonce };
}
