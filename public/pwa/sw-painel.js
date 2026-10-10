// Service worker do app instalado. Guarda só a tela "sem conexão" e os ícones.
// Páginas e dados NUNCA ficam guardados no aparelho (são dados de saúde): tudo vem da rede.
const VERSAO = "v1";
const CACHE = "rh-" + VERSAO;
const BASICO = ["/pwa/offline.html", "/pwa/icone-192.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(BASICO)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const r = e.request;
  if (r.method !== "GET" || r.mode !== "navigate") return; // só intercepta a abertura de telas
  e.respondWith(fetch(r).catch(() => caches.match("/pwa/offline.html")));
});
