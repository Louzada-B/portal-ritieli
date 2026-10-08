import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

// Criptografia dos dados sensíveis (AES-256-GCM) com a CHAVE_CRIPTO da Vercel.
// O banco guarda só o texto cifrado; ninguém lê sem essa chave.
function chave() {
  const k = process.env.CHAVE_CRIPTO;
  if (!k) throw new Error("CHAVE_CRIPTO ausente");
  return createHash("sha256").update(k).digest();
}

export function cifrar(texto: string) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", chave(), iv);
  const dados = Buffer.concat([c.update(texto, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), dados].map((b) => b.toString("base64")).join(".");
}

export function decifrar(pacote: string) {
  const [iv, tag, dados] = pacote.split(".").map((p) => Buffer.from(p, "base64"));
  const d = createDecipheriv("aes-256-gcm", chave(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(dados), d.final()]).toString("utf8");
}

export const cifrarOuNulo = (t?: string | null) => (t && t.trim() ? cifrar(t.trim()) : null);
export function decifrarOuVazio(p?: string | null) {
  if (!p) return "";
  try {
    return decifrar(p);
  } catch {
    return "";
  }
}

// Links pessoais: o token vai no link; o banco guarda só o hash.
export function novoToken() {
  const token = randomBytes(24).toString("base64url");
  return { token, hash: hashToken(token) };
}
export const hashToken = (t: string) => createHash("sha256").update(`link|${t}`).digest("hex");
