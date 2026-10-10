"use client";

// Cifra o recado no navegador da paciente com a chave pública da Ritieli (RSA-OAEP + AES-GCM).
// O servidor só guarda o resultado e não consegue ler.
const b64 = (u: Uint8Array) => { let s = ""; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); };
const deB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0)) as Uint8Array<ArrayBuffer>;

export async function cifrarRecado(pubB64: string, texto: string): Promise<string> {
  const pub = await crypto.subtle.importKey("spki", deB64(pubB64), { name: "RSA-OAEP", hash: "SHA-256" }, false, ["encrypt"]);
  const aes = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, aes, new TextEncoder().encode(texto)));
  const wk = new Uint8Array(await crypto.subtle.encrypt({ name: "RSA-OAEP" }, pub, await crypto.subtle.exportKey("raw", aes)));
  return `v1.${b64(wk)}.${b64(iv)}.${b64(ct)}`;
}
