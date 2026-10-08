// Formatação compartilhada (site e painel).
export const soDigitos = (v: string) => (v || "").replace(/\D/g, "");

export function fone(v?: string | null) {
  const d = soDigitos(v || "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return v || "";
}

export function normalizarFone(v: string) {
  let d = soDigitos(v);
  if (d.length >= 12 && d.startsWith("55")) d = d.slice(2);
  return d.length === 10 || d.length === 11 ? d : null;
}

export function cpfValido(v: string) {
  const c = soDigitos(v);
  if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false;
  const dv = (n: number) => {
    let s = 0;
    for (let i = 0; i < n; i++) s += Number(c[i]) * (n + 1 - i);
    const r = (s * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(9) === Number(c[9]) && dv(10) === Number(c[10]);
}

export const cpfFormatado = (v: string) => {
  const c = soDigitos(v);
  return c.length === 11 ? `${c.slice(0, 3)}.${c.slice(3, 6)}.${c.slice(6, 9)}-${c.slice(9)}` : v;
};
export const cpfMascarado = (final?: string | null) => (final ? `•••.•••.•••-${final}` : "");

export function reais(centavos?: number | null) {
  if (centavos == null) return "";
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: centavos % 100 ? 2 : 0 });
}

export function centavosDe(v: string) {
  const t = (v || "").replace(/[^\d,.]/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(t);
  return t && Number.isFinite(n) ? Math.round(n * 100) : null;
}

export const waLink = (numero: string, texto: string) => {
  const d = soDigitos(numero);
  return `https://wa.me/${d.startsWith("55") && d.length > 11 ? d : "55" + d}?text=${encodeURIComponent(texto)}`;
};

export const primeiroNome = (n: string) => (n || "").trim().split(/\s+/)[0] || "";
export const iniciais = (n: string) => (n || "").split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]!.toUpperCase()).join("");

export const DIAS_PLURAL = ["Domingos", "Segundas", "Terças", "Quartas", "Quintas", "Sextas", "Sábados"];
export const fixoTexto = (dia?: number | null, hora?: string | null) => (dia == null || !hora ? "A definir" : `${DIAS_PLURAL[dia]}, ${hora.slice(0, 5)}`);
