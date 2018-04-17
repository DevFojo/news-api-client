(function () {
    'use strict';
    const apiKey = '7a8dfe28afa24555aa4dbff00d1dfe3d';
    var app = {
        isLoading: true,
        filter: {},
        displayedArticles: {},
        spinner: document.querySelector('.loader'),
        articleItemTemplate: document.querySelector('.article_template'),
        articleList: document.querySelector('.article_list'),
        filterDialog: document.querySelector('.filter_dialog')
    };

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker
            .register('./service-worker.js')
            .then(function () {
                console.debug('[ServiceWorker] Registered');
            }).catch(function (err) {
                console.error('[ServiceWorker] Registration failed');
            });
    }

    if ((!window.indexedDB)) {
        console.error('[IndexedDb] This browser doesn\'t supports IndexedDB');
        return;
    }
    const dbPromise = idb.open('news-api-client-db', 3, function (upgradeDb) {
        switch (upgradeDb.oldVersion) {
            case 0:
            case 1:
                console.debug('[IndexedDb] Creating the articles object store');
                upgradeDb.createObjectStore('articles', {
                    keyPath: 'url'
                });
            case 2:
                console.debug('Creating a articles source index');
                var store = upgradeDb.transaction.objectStore('articles');
                store.createIndex('source', 'source', {});
        }
    });
    window.onload = function () {
        app.spinner.removeAttribute('hidden');
        app.articleList.setAttribute('hidden', true);
        app.isLoading = true;
        app.updateNews();
        app.populateCountries().then(function () {
            console.log('populated countries');
        }).catch(function () {
            console.error('cant populate countries');
        });
        app.populateCategories().then(function () {
            console.log('populated Category');
        }).catch(function () {
            console.error('cant populate Category');
        });


    };

    document.getElementById('btnRefresh').addEventListener('click', function () {
        app.displayedArticles = {};
        app.spinner.removeAttribute('hidden');
        app.articleList.setAttribute('hidden', true);
        app.isLoading = true;
        app.updateNews();
    });

    document.getElementById('btnFilter').addEventListener('click', function () {
        app.filterDialog.showModal();
    });

    if (!app.filterDialog.showModal) {
        dialogPolyfill.registerDialog(app.filterDialog);
    }

    app.filterDialog.querySelector('.btnCloseFilterDialog')
        .addEventListener('click', function () {
            app.filterDialog.close();
        });

    app.updateNews = function () {
        app.getArticles()
            .then(function (articles) {
                app.saveArticles(articles).then(function (o) {
                    app.updateCards(articles);
                    app.spinner.setAttribute('hidden', true);
                    app.articleList.removeAttribute('hidden');
                    app.isLoading = false;
                }).catch(function (err) {
                    console.error(err);
                });

            })
            .catch(function (err) {
                console.error(err);
                //get from db;
            });
    };

    app.getArticles = function () {
        return new Promise(function (resolve, reject) {

            var filter = buildFilter(app.filter);
            var xhr = new XMLHttpRequest(),
                url = 'https://newsapi.org/v2/top-headlines?' + filter + '&apiKey=' + apiKey,
                method = 'GET';
            xhr.open(method, url, true);
            xhr.onreadystatechange = function () {
                if (xhr.readyState === XMLHttpRequest.DONE) {
                    if (xhr.status === 200) {
                        var response = JSON.parse(xhr.response);
                        if (response.articles) {
                            resolve(response.articles);
                        } else {
                            reject(response);
                        }
                    } else {
                        reject({
                            responseCode: xhr.status
                        });
                    }
                }
            };
            xhr.send();
        });
    };

    app.getArticle = function (articleUrl) {
        return new Promise(function (resolve, reject) {
            dbPromise.then(function (db) {
                return db.transaction('articles')
                    .objectStore('articles').get(articleUrl);
            }).then(function (article) {
                resolve(article);
            }).catch(function (err) {
                console.error(err);
                resolve(null);
            });
        });
    };

    app.saveArticles = function (articles) {
        return dbPromise.then(function (db) {
            var tx = db.transaction('articles', 'readwrite');
            var store = tx.objectStore('articles');
            return Promise.all(articles.map(function (article) {
                return app.getArticle(article.url).then(function (savedArticle) {
                    if (!savedArticle) {
                        tx = db.transaction('articles', 'readwrite');
                        store = tx.objectStore('articles');
                        store.add(article).then(function (url) {
                            console.debug('saved new', url);
                        });
                    }
                    return article;
                });
            }));
        });
    };

    app.updateCards = function (newArticles) {
        newArticles.sort(function (a, b) {
            return new Date(b.publishedAt) - new Date(a.publishedAt);
        });
        newArticles.map(function (article) {
            if (!(article.url in app.displayedArticles)) {
                var articleCard = app.articleItemTemplate.cloneNode(true);
                articleCard.classList.remove('article_template');
                articleCard.querySelector('.article_title').textContent = article.title;
                var description = articleCard.querySelector('.article_description');
                if (article.description) {
                    description.textContent = article.description;
                } else {
                    description.setAttribute('hidden', true);
                }
                articleCard.querySelector('.article_link').href = article.url;
                articleCard.querySelector('.article_source').appendChild(document.createTextNode(' ' + article.source.name));
                articleCard.querySelector('.article_time').appendChild(document.createTextNode(' ' + dateToString(new Date(article.publishedAt))));
                articleCard.removeAttribute('hidden');
                app.articleList.insertBefore(articleCard, app.articleList.children[0]);
                app.displayedArticles[article.url] = article;
            }
        });
    };

    app.populateCountries = function () {
        return new Promise(function (resolve, reject) {
            if (countries) {
                var countrySelect = app.filterDialog.querySelector('.country_filter_list');
                countries.forEach(function (country) {
                    var option = document.createElement('li');
                    option.textContent = country.name;
                    option.className = "mdl-menu__item";
                    option.setAttribute('data-val', country.code);
                    if (country.code == 'ng') {
                        option.setAttribute('data-selected', true);
                    }
                    countrySelect.appendChild(option);
                });
                resolve();
            } else {
                reject();
            }
        });
    };

    app.populateCategories = function () {
        return new Promise(function (resolve, reject) {
            if (categories) {
                var select = app.filterDialog.querySelector('.category_filter');
                var emptyOption = document.createElement('option');
                emptyOption.selected = true;
                debugger;
                select.appendChild(emptyOption);
                categories.forEach(function (category) {
                    var option = document.createElement('option');
                    option.textContent = toTitleCase(category);
                    option.value = category;
                    select.appendChild(option);
                });
                resolve();
            } else {
                reject();
            }
        });
    };

    app.populateSources = function () {

    }
})();

function toTitleCase(str) {
    return str.charAt(0).toUpperCase() + str.substr(1).toLowerCase();
}

function dateToString(date) {
    var today = new Date();
    var day = today.getDate();
    var month = today.getMonth() + 1;
    var hour = today.getHours();
    var minutes = today.getMinutes();
    var prependZero = function (value) {
        return value < 10 ? '0' + value : value;
    };

    today = prependZero(day) + '-' + prependZero(month) + ' ' + prependZero(hour) + ':' + prependZero(minutes);
    return today;
}

function buildFilter(filter) {
    var country = '';
    var source = '';
    var query = '';
    if (filter) {
        country = filter.country ? filter.country : country;
        source = filter.source ? filter.source : source;
        query = filter.query ? filter.query : query;
        if (!country && !source && !query) {
            country = 'ng';
        }
    } else {
        country = 'ng';
    }
    return (country ? 'country=' + country : '') + (query ? '&q=' + query : '') + (source ? '&sources=' + source : '');
}