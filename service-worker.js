var cacheName = 'news-api-client';
var filesToCache = [
    './index.html',
    './js/app.js',
    './css/style.css',
    './js/material.min.js',
    './css/material.blue_grey-indigo.min.css',
    './js/mdl-selectfield.min.js',
    './css/mdl-selectfield.min.css',
    './js/data.js'
];

self.addEventListener('install', function (e) {
    console.log('[ServiceWorker] Install');
    e.waitUntil(
        caches.open(cacheName).then(function (cache) {
            console.log('[ServiceWorker] Caching app shell');
            return cache.addAll(filesToCache);
        })
    );
});

self.addEventListener('activate', function (e) {
    console.log('[ServiceWorker] Activate');
    e.waitUntil(
        caches.keys().then(function (keyList) {
            return Promise.all(keyList.map(function (key) {
                if (key !== cacheName) {
                    console.log('[ServiceWorker] Removing old cache', key);
                    return caches.delete(key);
                }
            }));

        })
    );
    return self.clients.claim();
});

self.addEventListener('fetch', function (e) {
    console.log('[ServiceWorker] Fetch', e.request.url);
    //var newsApiUrl = 'https://newsapi.org/v2';
    e.respondWith(
        caches.open(cacheName).then(function (cache) {
            return cache.match(e.request).then(function (response) {
                return response || fetch(e.request).then(function (response) {
                    cache.put(e.request, response.clone());
                    return response;
                });
            });
        })
    );
});