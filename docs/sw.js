// Service Worker para VRVS - Funcionamento Offline
// ATUALIZAR ESTA VERSÃO SEMPRE QUE FIZER MUDANÇAS PARA FORÇAR ATUALIZAÇÃO
const CACHE_NAME = "vrvs-v5.5.6";

// Arquivos essenciais para cache
const FILES_TO_CACHE = [
    './',
    './index.html',
    './manifest.json',
    './logo.png',
    './favicon.ico'
];

// Instalar Service Worker
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Instalando versão:', CACHE_NAME);
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Fazendo cache dos arquivos');
            return cache.addAll(FILES_TO_CACHE);
        })
    );
    // Forçar ativação imediata para atualizações
    self.skipWaiting();
});

// Ativar Service Worker
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Ativando versão:', CACHE_NAME);
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[Service Worker] Removendo cache antigo:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    // Garantir controle imediato de todas as páginas
    return self.clients.claim();
});

// Interceptar requisições
self.addEventListener('fetch', (event) => {
    // Ignorar requisições não-GET
    if (event.request.method !== 'GET') {
        return;
    }

    // Ignorar requisições de API externas (mas permitir CDNs)
    const url = new URL(event.request.url);
    if (url.origin !== location.origin && 
        !url.href.includes('cdn.jsdelivr.net')) {
        return;
    }

    // ESTRATÉGIA: Network-first para HTML (força atualização sempre)
    if (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html')) {
        event.respondWith(
            fetch(event.request, { cache: 'no-store' }).then((response) => {
                // Se conseguiu buscar da rede, atualizar cache
                if (response && response.status === 200) {
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return response;
            }).catch(() => {
                // Se offline, usar cache
                return caches.match(event.request).then((response) => {
                    return response || caches.match('./index.html');
                });
            })
        );
        return;
    }

    // Para outros arquivos, usar cache-first mas verificar atualização
    event.respondWith(
        caches.match(event.request).then((response) => {
            // Buscar da rede primeiro para verificar atualizações
            return fetch(event.request).then((networkResponse) => {
                // Se conseguiu da rede e é sucesso, atualizar cache
                if (networkResponse && networkResponse.status === 200) {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                    return networkResponse;
                }
                // Se não conseguiu da rede, usar cache se disponível
                return response || networkResponse;
            }).catch(() => {
                // Se offline, usar cache se disponível
                if (response) {
                    return response;
                }
                // Se for HTML e offline, retornar index.html
                if (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html')) {
                    return caches.match('./index.html');
                }
            });
        })
    );
});

// Sincronização em background quando voltar online
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-data') {
        event.waitUntil(syncData());
    }
});

async function syncData() {
    // Aqui você pode adicionar lógica para sincronizar dados quando voltar online
    console.log('[Service Worker] Sincronizando dados...');
}

// Mensagem para notificar atualização disponível
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});


