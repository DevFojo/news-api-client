/*jshint esversion: 6 */
(() => {
    'use strict';
    var apiKey = '7a8dfe28afa24555aa4dbff00d1dfe3d';
    var app = {
        _isLoading: false,
        filter: {
            country: 'ng'
        },
        displayedArticles: {},
        loader: $('#loader'),
        refreshButton: $('#refresh-button'),
        articleTemplate: $('.article-template'),
        articleList: $('.article-list'),

        filterHTMLElement: {
            dialog: $('#filter-dialog'),
            openButton: $('#filter-dialog-open-button'),
            closeButton: $('#filter-dialog-close-button'),
            submitButton: $('#filter-dialog-submit-button')
        },
        sources: [],
        lastArticle: {},
    };

    // if ('serviceWorker' in navigator) {
    //     navigator.serviceWorker
    //         .register('./service-worker.js')
    //         .then(()=> {
    //             console.debug('[ServiceWorker] Registered');
    //         }).catch( (err) {
    //             console.error('[ServiceWorker] Registration failed');
    //         });
    // }

    Object.defineProperty(app, 'isLoading', {
        set: (x) => {
            if (x) {
                app.loader.addClass('loading');
                app.refreshButton.attr('disabled', true);
            } else {
                app.loader.removeClass("loading");
                app.refreshButton.attr('disabled', false);
            }
            app._isLoading = x;
        },

        get: () => app._isLoading
    });

    if ((!window.indexedDB)) {
        console.error('[IndexedDb] This browser doesn\'t supports IndexedDB');
        return;
    }

    var dbPromise = idb.open('news-api-client-db', 3, (upgradeDb) => {
        switch (upgradeDb.oldVersion) {
            case 0:
            case 1:
                console.debug('[IndexedDb] Creating the articles object store');
                upgradeDb.createObjectStore('articles', {
                    keyPath: 'keyPath'
                });
                break;
            case 2:
                console.debug('Creating a articles source index');
                var store = upgradeDb.transaction.objectStore('articles');
                store.createIndex('source', 'source', {});
        }
    });

    app.init = () => {
        app.refreshButton.click(() => {
            app.isLoading = true;
            console.log('refreshing...');
            app.updateNews();
        });
        app.filterHTMLElement.openButton.click(() => app.filterHTMLElement.dialog.modal('show'));
        app.filterHTMLElement.closeButton.click(() => app.filterHTMLElement.dialog.modal('hide'));
        app.filterHTMLElement.submitButton.click(() => {
            app.filterHTMLElement.dialog.modal('hide');
            console.debug('filter', app.filter);
            app.isLoading = true;
        });
        app.populateFilterCountryDropdown().then(() => {
            console.debug('populated countries');
        }).catch((err) => {
            console.error('cant populate countries', err);
        });
        app.populateFilterSourceDropdown().then(() => {
            console.debug('populated sources');
        }).catch((err) => {
            console.error('cant populate sources', err);
        });
        $(window).on("scroll", () => {
            var scrollHeight = $(document).height();
            var scrollPosition = $(window).height() + $(window).scrollTop();
            if ((scrollHeight - scrollPosition) / scrollHeight === 0) {
                app.showOlderNews();
            }
        });

    };


    window.onload = () => {
        app.init();
        app.isLoading = true;
        app.updateNews();
    };

    app.updateNews = () => {
        app.getArticlesFromApi()
            .then(articles => {
                app.updateCards(articles);
                app.isLoading = false;
                app.saveArticles(articles).then((o) => {
                    console.log('saved artivles');
                }).catch((err) => {
                    console.error(err);
                });

            })
            .catch((err) => {
                //alert error getting latest news
                console.error(err);
                app.showOlderNews();
            });

    };

    app.getArticlesFromApi = () => {
        return new Promise((resolve, reject) => {
            var filter = buildFilter(app.filter),
                xhr = new XMLHttpRequest(),
                url = 'https://newsapi.org/v2/top-headlines?' + filter + '&apiKey=' + apiKey,
                method = 'GET';
            xhr.open(method, url, true);
            xhr.onreadystatechange = () => {
                if (xhr.readyState === XMLHttpRequest.DONE) {
                    if (xhr.status === 200) {
                        var response = JSON.parse(xhr.response);
                        if (response.articles) {
                            resolve(response.articles.map(article => {
                                var _article = article,
                                    timeStamp = Date.parse(article.publishedAt);
                                _article.timeStamp = timeStamp;
                                _article.keyPath = timeStamp + ':' + article.url;
                                _article.country = filter.country;
                                _article.category = filter.category;
                                return _article;
                            }));
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

    app.showOlderNews = () => {
        app.getArticlesFromIdb().then(cachedArticles => {
            console.log(cachedArticles);
            debugger;
            app.updateCards(cachedArticles);
            app.isLoading = false;

        });
    };

    app.getArticlesFromIdb = () => {
        return new Promise((resolve, reject) => {
            dbPromise.then(db => {
                    return db.transaction('articles')
                        .objectStore('articles').getAll();
                }).then(articles => {
                    if (articles && articles.length > 0) {
                        articles.sort((a, b) => b.timeStamp - a.timeStamp);
                        var lastArticleIndex = articles.findIndex(article => article.keyPath === app.lastArticle.keyPath);
                        if (lastArticleIndex > -1) {
                            resolve(articles.slice(lastArticleIndex, lastArticleIndex + 19));
                        } else {
                            resolve(articles.slice(0, 10));
                        }
                    } else {
                        resolve([]);
                    }
                })
                .catch(err => {
                    console.error(err);
                    reject(err);
                });
        });
    };

    app.getArticle = (articleUrl) => {
        return new Promise((resolve, reject) => {
            dbPromise.then((db) => {
                return db.transaction('articles')
                    .objectStore('articles').get(articleUrl);
            }).then((article) => {
                resolve(article);
            }).catch((err) => {
                console.error(err);
                resolve(null);
            });
        });
    };

    app.saveArticles = (articles) => {
        return dbPromise.then((db) => {
            var tx = db.transaction('articles', 'readwrite'),
                store = tx.objectStore('articles');
            return Promise.all(articles.map((article) => {
                return app.getArticle(article.keyPath).then((savedArticle) => {
                    if (!savedArticle) {
                        tx = db.transaction('articles', 'readwrite');
                        store = tx.objectStore('articles');
                        store.add(article).then((url) => {
                            console.debug('saved new', url);
                        });
                    }
                    if ((app.sources.indexOf(article.source.name) < 0)) {
                        app.sources.push(article.source.name);
                    }
                    return article;
                });
            }));
        });
    };

    app.updateCards = (newArticles) => {
        newArticles.sort((b, a) => {
            return new Date(b.publishedAt) - new Date(a.publishedAt);
        });
        app.lastArticle = newArticles[newArticles.length - 1];
        newArticles.map((article) => {
            if (!(article.keyPath in app.displayedArticles)) {
                var articleCard = app.articleTemplate.clone();
                articleCard.removeClass('article-template');
                articleCard.find('.header').text(article.title);
                var description = articleCard.find('.description');
                if (article.description) {
                    description.text(article.description);
                } else {
                    description.parent().remove();
                }
                articleCard.attr('href', article.url);
                articleCard.find('.source').append((' ' + article.source.name));
                articleCard.find('.time').append((' ' + dateToString(new Date(article.publishedAt))));
                articleCard.attr('hidden', false);
                app.articleList.prepend(articleCard);
                app.displayedArticles[article.keyPath] = article;
            }
        });
    };

    app.populateFilterCountryDropdown = () => {
        return new Promise((resolve, reject) => {
            if (countries) {
                var dropdown = app.filterHTMLElement.dialog.find('.country-filter-dropdown');
                var dropdownValues = countries.map(c => ({
                    name: c.name,
                    value: c.code,
                    selected: c.code === app.filter.country
                }));
                dropdownValues.splice(0, 0, {
                    name: 'All',
                    value: ''
                });
                dropdown.dropdown({
                    showOnFocus: false,
                    onChange: (value) => {
                        app.filter.country = value;
                    },
                    values: dropdownValues
                });
                resolve();
            } else {
                reject();
            }
        });
    };

    app.populateFilterSourceDropdown = () => {
        return new Promise((resolve, reject) => {
            if (categories) {
                var select = app.filterDialog.querySelector('.category_filter_list');
                var emptyOption = document.createElement('li');
                emptyOption.setAttribute('data-selected', true);
                select.appendChild(emptyOption);
                categories.forEach((category) => {
                    var option = document.createElement('li');
                    option.textContent = toTitleCase(category);
                    option.className = "mdl-menu__item";
                    option.setAttribute('data-val', category);
                    select.appendChild(option);
                });
                getmdlSelect.init('.category_filter_select');
                resolve();
            } else {
                reject();
            }
        });
    };

    app.populateFilterSourceDropdown = () => {
        return new Promise((resolve, reject) => {
            if (app.sources) {
                if (app.sources.length > 0) {
                    var select = app.filterDialog.querySelector('.source_filter_list');
                    var emptyOption = document.createElement('li');
                    emptyOption.setAttribute('data-selected', true);
                    select.appendChild(emptyOption);
                    app.sources.forEach((source) => {
                        var option = document.createElement('li');
                        option.textContent = toTitleCase(source);
                        option.className = "mdl-menu__item";
                        option.setAttribute('data-val', source);
                        select.appendChild(option);
                    });
                }
                resolve();
            } else {
                reject();
            }
        });
    };
    var toTitleCase = (str) => {
        return str.charAt(0).toUpperCase() + str.substr(1).toLowerCase();
    };

    var dateToString = (date) => {
        if (!date) {
            date = today;
        }
        var today = new Date(date);
        var day = today.getDate();
        var month = today.getMonth() + 1;
        var hour = today.getHours();
        var minutes = today.getMinutes();
        var prependZero = (value) => {
            return value < 10 ? '0' + value : value;
        };

        today = prependZero(day) + '-' + prependZero(month) + ' ' + prependZero(hour) + ':' + prependZero(minutes);
        return today;
    };

    var buildFilter = (filter) => {
        var country = '';
        var source = '';
        var query = '';
        var category = '';
        if (filter) {
            country = filter.country ? filter.country : country;
            source = filter.source ? filter.source : source;
            category = filter.category ? filter.category : category;
            query = filter.query ? filter.query : query;
            if (!country && !source && !query) {
                country = 'ng';
            }
        } else {
            country = 'ng';
        }
        return (country ? 'country=' + country : '') + (query ? '&q=' + query : '') + (source ? '&sources=' + source : '') + (category ? '&category=' + category : '');
    };
})();