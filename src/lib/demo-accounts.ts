const demoAccountEmails = new Set(["admin@ocean.local", "user@ocean.local"]);

export function isDemoAccountEmail(email: string): boolean {
  return demoAccountEmails.has(email.toLowerCase());
}
