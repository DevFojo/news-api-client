(function () {
    'use strict';

    var app = {
        isLoading: true,
        articles: {},
        spinner: document.querySelector('.loader'),
        cardTemplate: document.querySelector('.cardTemplate'),
        container: document.querySelector('.main'),
        addDialog: document.querySelector('.dialog-container'),
    };

    // document.getElementById('btnRefresh').addEventListener('click', function () {
    //     app.spinner.removeAttribute('hidden');
    //     app.container.setAttribute('hidden', true);
    //     app.isLoading = true;
    //     app.updateNews();
    // });

    app.updateNews = function () {
        if (app.isLoading) {
            app.getNews().then(function () {
                console.log("got news");
                app.spinner.setAttribute('hidden', true);
                app.container.removeAttribute('hidden');
                app.isLoading = false;
            });
        }
    };
    app.getNews = function (key, label) {
        return new Promise(function (resolve, reject) {
            var xhr = new XMLHttpRequest(),
                url = 'https://newsapi.org/v2/top-headlines?country=ng&apiKey=7a8dfe28afa24555aa4dbff00d1dfe3d',
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

    app.updateCards = function () {};

    app.updateNewsCard = function (data) {
        data.map(function (c) {
            var article = app.articles[c.url];
            if (!article) {
                article = {
                    'source': c.source.name,
                    'title': c.title,
                    'description': c.description
                };
                app.articles[c.url] = article;
                var card = app.cardTemplate.cloneNode(true);
                card.classList.remove('cardTemplate');
                card.querySelector('.location').textContent = c.title;
                card.removeAttribute('hidden');
                app.container.appendChild(card);
                console.log('article created', article);
            }
        });
    };

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker
            .register('./service-worker.js')
            .then(function () {
                console.log('Service Worker Registered');
            });
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
})();