// Web Crypto helpers — AES-GCM symmetric encryption.
// In a real E2EE app, each conversation key would be derived via ECDH between
// per-user identity keys. For this local-only demo we generate a per-conversation
// symmetric key once and persist it (wrapped) in IndexedDB.

const enc = new TextEncoder();
const dec = new TextDecoder();

export async function generateConversationKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
}

export async function exportKey(key: CryptoKey): Promise<JsonWebKey> {
  return crypto.subtle.exportKey("jwk", key);
}

export async function importKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey("jwk", jwk, { name: "AES-GCM" }, true, ["encrypt", "decrypt"]);
}

function bufToB64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
function b64ToBuf(b64: string): ArrayBuffer {
  const s = atob(b64);
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return bytes.buffer;
}

export interface Ciphertext {
  iv: string; // base64
  data: string; // base64
}

export async function encryptText(key: CryptoKey, plaintext: string): Promise<Ciphertext> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(plaintext));
  return { iv: bufToB64(iv.buffer), data: bufToB64(cipher) };
}

export async function decryptText(key: CryptoKey, ct: Ciphertext): Promise<string> {
  const iv = new Uint8Array(b64ToBuf(ct.iv));
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, b64ToBuf(ct.data));
  return dec.decode(plain);
}

export async function encryptBytes(key: CryptoKey, bytes: ArrayBuffer): Promise<Ciphertext> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, bytes);
  return { iv: bufToB64(iv.buffer), data: bufToB64(cipher) };
}

export async function decryptBytes(key: CryptoKey, ct: Ciphertext): Promise<ArrayBuffer> {
  const iv = new Uint8Array(b64ToBuf(ct.iv));
  return crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, b64ToBuf(ct.data));
}

export function fingerprint(jwk: JsonWebKey): string {
  // Short visual fingerprint for UI display
  const k = jwk.k || "";
  let h = 0;
  for (let i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) >>> 0;
  const hex = h.toString(16).padStart(8, "0");
  return `${hex.slice(0, 4)} ${hex.slice(4, 8)}`.toUpperCase();
}
