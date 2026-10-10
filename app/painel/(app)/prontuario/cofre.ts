"use client";

// Cofre do prontuário: criptografia de ponta a ponta no navegador (Web Crypto).
// Uma chave mestra aleatória cifra tudo. Ela é guardada no banco "embrulhada" duas
// vezes: pela senha do prontuário e pela chave de recuperação. A chave aberta só
// existe na memória desta aba e some ao fechar, recarregar ou após 10 min sem uso.

export type Pacote = { salt_senha: string; iteracoes: number; chave_senha: string; salt_rec: string; chave_rec: string };

const ITER = 600000;
const ITER_REC = 200000;
const OCIOSO_MS = 10 * 60 * 1000;
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
type U8 = Uint8Array<ArrayBuffer>;
const enc = new TextEncoder();
const dec = new TextDecoder();

const b64 = (u: U8) => {
  let s = "";
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
  return btoa(s);
};
const deB64 = (s: string): U8 => Uint8Array.from(atob(s), (c) => c.charCodeAt(0)) as U8;
const aleatorio = (n: number): U8 => crypto.getRandomValues(new Uint8Array(n));

async function derivar(segredo: string, salt: string, iteracoes: number) {
  const base = await crypto.subtle.importKey("raw", enc.encode(segredo) as U8, "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt: deB64(salt), iterations: iteracoes, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
async function selar(chave: CryptoKey, dados: U8) {
  const iv = aleatorio(12);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, chave, dados));
  return `${b64(iv)}.${b64(ct)}`;
}
async function abrirSelo(chave: CryptoKey, pacote: string): Promise<U8> {
  const [iv, ct] = pacote.split(".");
  return new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: deB64(iv) }, chave, deB64(ct)));
}

// ---- estado da aba ----
let mestra: CryptoKey | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
const ouvintes = new Set<(aberto: boolean) => void>();
const avisar = () => ouvintes.forEach((f) => f(!!mestra));

export const estaAberto = () => !!mestra;
export function aoMudar(f: (aberto: boolean) => void) {
  ouvintes.add(f);
  return () => { ouvintes.delete(f); };
}
export function fechar() {
  mestra = null;
  if (timer) clearTimeout(timer);
  timer = null;
  avisar();
}
export function tocar() {
  if (!mestra) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(fechar, OCIOSO_MS);
}
async function usar(raw: U8) {
  mestra = await crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
  raw.fill(0);
  tocar();
  avisar();
}

// ---- chave de recuperação ----
export function novoCodigo() {
  const r = aleatorio(24);
  const c = Array.from(r, (b) => ALFABETO[b % ALFABETO.length]).join("");
  return c.match(/.{4}/g)!.join("-");
}
const limparCodigo = (c: string) => c.toUpperCase().replace(/[^A-Z0-9]/g, "");

// Cria o cofre: devolve o pacote para guardar no banco e já deixa aberto nesta aba.
export async function criar(senha: string, codigo: string): Promise<Pacote> {
  const raw = aleatorio(32);
  const salt_senha = b64(aleatorio(16));
  const salt_rec = b64(aleatorio(16));
  const pacote: Pacote = {
    salt_senha,
    iteracoes: ITER,
    chave_senha: await selar(await derivar(senha, salt_senha, ITER), raw),
    salt_rec,
    chave_rec: await selar(await derivar(limparCodigo(codigo), salt_rec, ITER_REC), raw),
  };
  await usar(raw);
  return pacote;
}

export async function abrir(senha: string, p: Pacote) {
  try {
    await usar(await abrirSelo(await derivar(senha, p.salt_senha, p.iteracoes), p.chave_senha));
    return true;
  } catch {
    return false;
  }
}

// Com a chave de recuperação, define uma senha nova (nada se perde).
export async function recuperar(codigo: string, novaSenha: string, p: Pacote): Promise<Pacote | null> {
  try {
    const raw = await abrirSelo(await derivar(limparCodigo(codigo), p.salt_rec, ITER_REC), p.chave_rec);
    const salt_senha = b64(aleatorio(16));
    const novo: Pacote = { ...p, salt_senha, iteracoes: ITER, chave_senha: await selar(await derivar(novaSenha, salt_senha, ITER), raw) };
    await usar(raw);
    return novo;
  } catch {
    return null;
  }
}

export async function trocarSenha(atual: string, nova: string, p: Pacote): Promise<Pacote | null> {
  try {
    const raw = await abrirSelo(await derivar(atual, p.salt_senha, p.iteracoes), p.chave_senha);
    const salt_senha = b64(aleatorio(16));
    const novo: Pacote = { ...p, salt_senha, iteracoes: ITER, chave_senha: await selar(await derivar(nova, salt_senha, ITER), raw) };
    await usar(raw);
    return novo;
  } catch {
    return null;
  }
}

// ---- conteúdo ----
function chave() {
  if (!mestra) throw new Error("fechado");
  tocar();
  return mestra;
}
export async function cifrar(obj: unknown) {
  return selar(chave(), enc.encode(JSON.stringify(obj)) as U8);
}
export async function decifrar<T = unknown>(s: string): Promise<T | null> {
  try {
    return JSON.parse(dec.decode(await abrirSelo(chave(), s))) as T;
  } catch {
    return null;
  }
}
export async function cifrarArquivo(dados: ArrayBuffer) {
  const iv = aleatorio(12);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, chave(), dados));
  const out = new Uint8Array(12 + ct.length);
  out.set(iv);
  out.set(ct, 12);
  return out;
}
export async function decifrarArquivo(dados: ArrayBuffer) {
  const u = new Uint8Array(dados);
  return crypto.subtle.decrypt({ name: "AES-GCM", iv: u.subarray(0, 12) }, chave(), u.subarray(12));
}

// ---- recados dos exercícios (a paciente cifra com a chave pública; só esta aba, com o cofre aberto, decifra) ----
export type ParRecados = { pub: string; privCripto: string };
export async function criarParRecados(): Promise<ParRecados> {
  const par = await crypto.subtle.generateKey({ name: "RSA-OAEP", modulusLength: 3072, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["encrypt", "decrypt"]);
  const pub = b64(new Uint8Array(await crypto.subtle.exportKey("spki", par.publicKey)) as U8);
  const priv = b64(new Uint8Array(await crypto.subtle.exportKey("pkcs8", par.privateKey)) as U8);
  return { pub, privCripto: await cifrar(priv) };
}
export async function decifrarRecado(privCripto: string, recado: string): Promise<string | null> {
  try {
    const priv = await decifrar<string>(privCripto);
    const [v, wk, iv, ct] = recado.split(".");
    if (!priv || v !== "v1") return null;
    const chavePriv = await crypto.subtle.importKey("pkcs8", deB64(priv), { name: "RSA-OAEP", hash: "SHA-256" }, false, ["decrypt"]);
    const raw = await crypto.subtle.decrypt({ name: "RSA-OAEP" }, chavePriv, deB64(wk));
    const aes = await crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["decrypt"]);
    return dec.decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: deB64(iv) }, aes, deB64(ct)));
  } catch {
    return null;
  }
}
