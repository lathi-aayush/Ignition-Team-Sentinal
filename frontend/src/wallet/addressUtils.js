/** Shared address helpers — no imports from pera.js or signPayment.js. */

export function normalizeAccountAddress(raw) {
  if (raw == null) return null;
  if (typeof raw === "string") {
    const s = raw.trim();
    return s.length ? s : null;
  }
  if (typeof raw === "object" && raw !== null) {
    const a = raw.address ?? raw.addr ?? raw.publicAddress;
    if (typeof a === "string" && a.trim().length) return a.trim();
  }
  return null;
}

/** Compare two Algorand addresses (handles casing / encoding differences). */
export async function addressesEqual(a, b) {
  const A = normalizeAccountAddress(a);
  const B = normalizeAccountAddress(b);
  if (!A || !B) return false;
  const algosdk = (await import("algosdk")).default;
  try {
    return (
      algosdk.encodeAddress(algosdk.decodeAddress(A)) ===
      algosdk.encodeAddress(algosdk.decodeAddress(B))
    );
  } catch {
    return A === B;
  }
}
