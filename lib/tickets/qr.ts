import { randomBytes } from "node:crypto";
import QRCode from "qrcode";

/**
 * A unique, unguessable token for one order_item — assigned once, at
 * payment settlement (see lib/payments/settle.ts). 128 bits of randomness;
 * collision risk against the `order_items.qr_code` unique constraint is
 * negligible enough that this doesn't retry on conflict.
 */
export function generateQrToken() {
  return `gvg_${randomBytes(16).toString("base64url")}`;
}

/**
 * Renders a token as a scannable QR code, returned as a PNG data URL —
 * server-only (uses the Node canvas-free renderer built into `qrcode`).
 * Cheap enough to generate on every page load rather than storing the
 * image; the token itself is the source of truth.
 */
export async function renderQrDataUrl(token: string) {
  return QRCode.toDataURL(token, {
    margin: 1,
    width: 320,
    color: { dark: "#111111", light: "#FFFFFFFF" },
  });
}
