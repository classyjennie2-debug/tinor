/*
 * Tibnor AB B2B Commerce Solution
 *
 * Copyright (c) 2018-2020. All rights reserved.
 *
 * This software is the confidential and proprietary information of Tibnor AB.
 */

ACC.search = {

    _autoload: [
        "bindSearchType"
    ],

    bindSearchType: function () {
        $('.js-type-switch-btn').on('click', function () {
            const type = $(this).data('type');
            const searchQuery = window.location.search.replace('?', '&').replace('page=', '');
            const matchArray = searchQuery.match('[&^.]type=[^&#]*');
            let newSearchQuery;

            if (!matchArray) {
                newSearchQuery = searchQuery + (searchQuery.length > 1 ? '&' : '?') + 'type=' + type;
            } else {
                const firstMatch = matchArray[0];
                newSearchQuery = searchQuery.replace(firstMatch, firstMatch.charAt(0)+'type='+type)
            }

            window.location = location.protocol + '//' + location.host + location.pathname + '?' + newSearchQuery.substring(1);
        });
    }
};