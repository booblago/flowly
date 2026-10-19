/** Browser helper: start Stripe Checkout and redirect. */
export async function startProCheckout(): Promise<{ error?: string }> {
  const res = await fetch("/api/billing/checkout", { method: "POST" });
  const data = await res.json();
  if (!res.ok) {
    return { error: data.error || "Checkout failed" };
  }
  if (data.url) {
    window.location.href = data.url as string;
    return {};
  }
  return { error: "No checkout URL returned" };
}

export async function openBillingPortal(): Promise<{ error?: string }> {
  const res = await fetch("/api/billing/portal", { method: "POST" });
  const data = await res.json();
  if (!res.ok) {
    return { error: data.error || "Portal failed" };
  }
  if (data.url) {
    window.location.href = data.url as string;
    return {};
  }
  return { error: "No portal URL returned" };
}

export async function confirmBillingSession(sessionId: string) {
  const res = await fetch("/api/billing/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId }),
  });
  const data = await res.json();
  if (!res.ok) {
    return { error: data.error as string };
  }
  return { user: data.user };
}
