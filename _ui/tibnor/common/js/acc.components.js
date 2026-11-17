/*
 * Tibnor AB B2B Commerce Solution
 *
 * Copyright (c) 2018-2020. All rights reserved.
 *
 * This software is the confidential and proprietary information of Tibnor AB.
 */

ACC.components = {

    _autoload: [
        "bindTiles", "bindNewsTiles"
    ],

    bindTiles: function () {
        var jsTiles = $('.js-tiles');

        if (jsTiles.length > 0) {

            function recalculateTileWidth() {
                const windowWidth = window.innerWidth;
                jsTiles.each(function () {
                    const jsTile = $(this).find('.js-tile'),
                          gutter = 24;
                    let tileWidth = 1,
                        size = 'desktop';

                    if(windowWidth < 640) {
                        size = 'mobile';
                    } else if(windowWidth > 640 && windowWidth < 992) {
                        size = 'tablet';
                    }
                    
                    tileWidth = $(this).data(size);
                    tileWidth = parseInt(tileWidth, 10);
                    tileWidth = 'calc(' + 100 / tileWidth + '% - ' + (gutter * (tileWidth - 1) / tileWidth) +  'px';

                    jsTile.css('width', tileWidth)
                })
            }

            recalculateTileWidth();

            $(window).resize(function () {
                recalculateTileWidth();
            });
        }
    },

    bindNewsTiles: function () {
        var jsNewsTiles = $('.js-newstiles');
        
        function getStyleVal(el, style) {
            return Math.floor((window.getComputedStyle(el)[style].replace('px', '') * 1));
        };

        if (jsNewsTiles.length) {
            function recalculateHeight() {
                var windowWidth = window.innerWidth;
                jsNewsTiles.each(function () {
                    var item1 = $(this).find('.js-tile')[0];
                    if (item1) {
                      var heightFirst = getStyleVal(item1, "height") + 1;
                      var heightOthers = 0;
                      $(this)
                        .find(".js-tile:not(:first-child)")
                        .each(function (a, b) {
                          var h = getStyleVal(b, "height");
                          var pb = getStyleVal(b, "paddingBottom");
                          heightOthers = heightOthers + h + pb + 1;
                        });
                      var heightContainer =
                        windowWidth <= 1024
                          ? "auto"
                          : heightFirst > heightOthers
                          ? heightFirst
                          : heightOthers;

                      $(this).css({ height: heightContainer });
                    }
                });
            }

            recalculateHeight();

            $(window).resize(function () {
                recalculateHeight();
            });

        }
    }
};
