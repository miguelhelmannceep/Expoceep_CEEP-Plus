// CEEP+ Service Worker (EXPOCEEP 2026)
// Estratégia: Network-First para App Shell + Cache para assets estáticos.
// REGRA MANDATÓRIA: NENHUMA requisição de API (/api/*) ou método não-GET é armazenado em cache.

const CACHE_NAME = 'ceep-plus-v2';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo-ceep.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        // Ativação imediata da nova versão sem aguardar fechar abas
        return self.skipWaiting();
      })
      .catch((err) => {
        console.warn('[SW] Falha no pré-cache:', err);
      })
  );
});

// Ativação e limpeza de caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          })
        );
      })
      .then(() => {
        // Assume controle imediato dos clientes ativos
        return self.clients.claim();
      })
  );
});

// Interceptação de requisições
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // 1. Apenas requisições GET podem ser avaliadas para cache
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // 2. SEGURANÇA MANDATÓRIA: NUNCA armazenar em cache respostas de API,
  // autenticação, transações ou hosts externos de backend.
  if (url.pathname.startsWith('/api') || url.pathname.includes('/api/v1/')) {
    return; // Deixa o navegador seguir diretamente pela rede
  }

  // 3. Ignora requisições de outras origens (ex: Google OAuth, CDNs)
  if (url.origin !== self.location.origin) {
    return;
  }

  // 4. Navegação (HTML da aplicação): Network-First com fallback para cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          const cached = await caches.match('/index.html');
          return cached || caches.match('/');
        })
    );
    return;
  }

  // 5. Assets estáticos com hash do Vite (/assets/*) e ícones estáticos:
  // Cache-First com fallback para rede
  if (
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        });
      })
    );
  }
});
