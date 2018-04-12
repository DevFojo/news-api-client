(function () {
    'use strict';

    var app = {
        isLoading: true,
        news: [],
        spinner: document.querySelector('.loader'),
        cardTemplate: document.querySelector('.cardTemplate'),
        container: document.querySelector('.main'),
        addDialog: document.querySelector('.dialog-container'),
    };

    document.getElementById('btnRefresh').addEventListener('click', function () {
        app.updateNews();
        app.updateCards();
    });

    app.updateNews = function () {
        console.log('updating news');
    };

    app.updateCards = function(){
    }
})();