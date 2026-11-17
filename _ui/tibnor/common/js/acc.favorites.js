/*
 * Tibnor AB B2B Commerce Solution
 * Copyright (c) 2024. All rights reserved.
 * This software is the confidential and proprietary information of Tibnor AB.
 */

ACC.favorites = {

    _autoload: [
        "bindFavoritesListingPage",
        "bindFavoriteBtns"
    ],

    bindFavoritesListingPage: function () {
        const $favoriteFilterForm = $('#favoriteFilterForm');
        $favoriteFilterForm.find(("select")).select2();
        $favoriteFilterForm.change(function (e) {
            this.submit();
        });
    },

    bindFavoriteBtns: function () {
        $(".js-product__list").on("click", ".js-btn-favorite", function () {
            ACC.favorites.toggleFavorite($(this));
        });
    },

    toggleFavorite: function ($btn) {
        const productCode = $btn.data("product-code");
        const verb = $btn.hasClass("selected") ? "DELETE" : "POST";
        $btn.addClass("btn-favorite-animated");
        $.ajax({
            url: ACC.config.contextPath + "/rest/favoriteproducts/" + productCode,
            type: verb,
            success: function (response) {
                const isFavorite = response.isFavoriteProduct || false;
                $btn.toggleClass("selected", isFavorite);
                $btn.data("selected", isFavorite);
            }
        });
    },
}