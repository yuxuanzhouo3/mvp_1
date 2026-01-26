const SECRET_KEY = process.env.ADMIN_SESSION_SECRET;
const SESSION_SECRET = SECRET_KEY || "dev-only-secret-key";

type AdminSession = {
  userId: string;
  username: string;
  createdAt: number;
  expiresAt: number;
};

function base64EncodeUtf8(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64DecodeUtf8(input: string): string {
  const binary = atob(input);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function decryptSessionEdge(token: string): AdminSession | null {
  try {
    const [encoded, sig] = token.split(".");
    if (!encoded || !sig) return null;

    const expectedSig = base64EncodeUtf8(`${encoded}.${SESSION_SECRET}`).slice(0, 16);
    if (sig !== expectedSig) return null;

    const payload = base64DecodeUtf8(encoded);
    return JSON.parse(payload) as AdminSession;
  } catch {
    return null;
  }
}

export function verifyAdminSessionTokenEdge(token: string): boolean {
  const session = decryptSessionEdge(token);
  if (!session) return false;
  return Date.now() <= session.expiresAt;
}
