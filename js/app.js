(function () {
    'use strict';

    var app = {
        isLoading: true,
        articleCards: {},
        filter: {},
        spinner: document.querySelector('.loader'),
        articleItemTemplate: document.querySelector('.article_template'),
        articleList: document.querySelector('.article_list'),
        //addDialog: document.querySelector('.dialog-container'),
    };

    document.getElementById('btnRefresh').addEventListener('click', function () {
        app.spinner.removeAttribute('hidden');
        app.articleList.setAttribute('hidden', true);
        app.isLoading = true;
        app.updateNews();
    });

    app.updateNews = function () {
        if (app.isLoading) {
            app.getNews().then(function () {
                console.log("got news");
                app.spinner.setAttribute('hidden', true);
                app.articleList.removeAttribute('hidden');
                app.isLoading = false;
            });
        }
    };
    app.getNews = function () {
        return new Promise(function (resolve, reject) {
            var country = '';
            var source = '';
            var query = '';
            if (app.filter) {
                country = app.filter.country ? app.filter.country : country;
                source = app.filter.source ? app.filter.source : source;
                query = app.filter.query ? app.filter.query : query;
            }
            if (!country && !source && !query) {
                country = 'ng';
            }
            var xhr = new XMLHttpRequest(),
                url = `https://newsapi.org/v2/top-headlines?country=${country}${query ? '&q=' + query : ''}${source ? '&sources=' + source : ''}&apiKey=7a8dfe28afa24555aa4dbff00d1dfe3d`,
                method = 'GET';
            xhr.open(method, url, true);
            xhr.onreadystatechange = function () {
                if (xhr.readyState === XMLHttpRequest.DONE) {
                    if (xhr.status === 200) {
                        var response = JSON.parse(xhr.response);
                        var results = response.articles;
                        app.updateNewsCard(results);
                    } else {
                        app.updateNewsCard(initialNews);
                    }
                    resolve();
                }
            };
            xhr.send();
        });
    };

    app.updateCards = function () { };

    app.updateNewsCard = function (data) {
        data.map(function (c) {
            var articleCard = app.articleCards[c.url];
            if (!articleCard) {
                articleCard = app.articleItemTemplate.cloneNode(true);
                articleCard.classList.remove('article_template');
                articleCard.querySelector('.article_title').textContent = c.title;
                var description = articleCard.querySelector('.article_description');
                if (c.description) {
                    description.textContent = c.description;
                } else {
                    description.setAttribute('hidden', true);
                }
                articleCard.querySelector('.article_link').href = c.url;
                articleCard.querySelector('.article_source').appendChild(document.createTextNode(' ' + c.source.name));
                articleCard.querySelector('.article_time').appendChild(document.createTextNode(' ' + new Date(c.publishedAt)));
                articleCard.removeAttribute('hidden');
                app.articleList.appendChild(articleCard);
            }
        });
    };

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker
            .register('./service-worker.js')
            .then(function () {
                console.log('[ServiceWorker] Registered');
            }).catch(function (err) {
                console.log('[ServiceWorker] Registration failed');
            });
    }

    if (!('indexedDB' in window)) {
        console.log('[IndexedDB] This browser doesn\'t support IndexedDB');
        return;
    }


    var initialNews = [{
        "source": {
            "id": null,
            "name": "Vanguardngr.com"
        },
        "author": null,
        "title": "Man, 70, arrested for abducting woman for 28 years",
        "description": null,
        "url": "https://www.vanguardngr.com/2018/04/man-70-arrested-abducting-woman-28-years/",
        "urlToImage": null,
        "publishedAt": "2018-04-14T22:19:50Z"
    },
    {
        "source": {
            "id": null,
            "name": "Vanguardngr.com"
        },
        "author": "View all posts by Nwafor Polycarp →",
        "title": "Conte praises Moses, others for strong comeback",
        "description": "Antonio Conte praised his Chelsea players for rediscovering the “fire in their eyes” after substitute Olivier Giroud inspired a 3-2 comeback victory at Southampton.",
        "url": "https://www.vanguardngr.com/2018/04/conte-praises-moses-others-strong-comeback/",
        "urlToImage": "https://www.vanguardngr.com/wp-content/uploads/2017/09/Victor-Moses.png",
        "publishedAt": "2018-04-14T22:19:50Z"
    }
    ];
    app.updateNews();
})();