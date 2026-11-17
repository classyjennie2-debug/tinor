ACC.product = {

    _autoload: [
        "bindToAddToCartForm",
        "enableStorePickupButton",
        "enableVariantSelectors",
        "bindFacets",
        "handleListAttrsLength"
    ],


    bindFacets: function () {
        $(document).on("click", ".js-show-facets", function (e) {
            e.preventDefault();
            var selectRefinementsTitle = $(this).data("selectRefinementsTitle");
            var colorBoxTitleHtml = ACC.common.encodeHtml(selectRefinementsTitle);
            ACC.colorbox.open(colorBoxTitleHtml, {
                href: ".js-product-facet",
                inline: true,
                width: "480px",
                height: "400px",
                onComplete: function () {
                    $('.js-facet-checkbox[checked]').each(function(){
                        $(this).parents(".js-facet").addClass("active");
                    });
                },
                onClosed: function () {
                    $('.js-facet-select + .js-facet-values').addClass('hidden');
                    $('.js-facet-values').removeAttr('style');
                    $('.js-facet').removeClass('active');
                }
            });
        });
        $(document).on("click", ".js-facet-name", function (e) {
            e.preventDefault();
            const pos = $('#colorbox').offset().top;
            $('.js-facet-values').removeClass('hidden');
            $(this).parents(".js-facet").toggleClass("active");
            
            $.colorbox.resize();
            $('#colorbox').css('top', pos)
        });
        
        enquire.register("screen and (min-width:" + screenSmMax + ")", function () {
            $("#cboxClose").trigger('click');
        });
    },


    enableAddToCartButton: function () {
        $('.js-enable-btn').each(function () {
            if (!($(this).hasClass('outOfStock') || $(this).hasClass('out-of-stock'))) {
                $(this).prop("disabled", false);
            }
        });
    },

    enableVariantSelectors: function () {
        $('.variant-select').prop("disabled", false);
    },

    bindToAddToCartForm: function () {
        var addToCartForm = $('.add_to_cart_form');
        addToCartForm.ajaxForm({
            beforeSubmit: ACC.product.showRequest,
            success: ACC.product.displayAddToCartPopup
        });
        setTimeout(function () {
            $ajaxCallEvent = true;
        }, 2000);
    },
    showRequest: function (arr, $form, options) {
        if ($ajaxCallEvent) {
            $ajaxCallEvent = false;
            return true;
        }
        return false;

    },

    bindToAddToCartStorePickUpForm: function () {
        var addToCartStorePickUpForm = $('#colorbox #add_to_cart_storepickup_form');
        addToCartStorePickUpForm.ajaxForm({success: ACC.product.displayAddToCartPopup});
    },

    enableStorePickupButton: function () {
        $('.js-pickup-in-store-button').prop("disabled", false);
    },

    displayAddToCartPopup: function (cartResult, statusText, xhr, formElement) {
        $ajaxCallEvent = true;
        $('#addToCartLayer').remove();
        if (typeof ACC.minicart.updateMiniCartDisplay == 'function') {
            ACC.minicart.updateMiniCartDisplay();
        }
        var titleHeader = $('#addToCartTitle').html();

        ACC.colorbox.open(titleHeader, {
            html: cartResult.addToCartLayer,
            width: "460px"
        });

        var productCode = $('[name=productCodePost]', formElement).val();
        var quantityField = $('[name=qty]', formElement).val();

        var quantity = 1;
        if (quantityField != undefined) {
            quantity = quantityField;
        }

        var cartAnalyticsData = cartResult.cartAnalyticsData;

        var cartData = {
            "cartCode": cartAnalyticsData.cartCode,
            "productCode": productCode, "quantity": quantity,
            "productPrice": cartAnalyticsData.productPostPrice,
            "productName": cartAnalyticsData.productName
        };
        ACC.track.trackAddToCart(productCode, quantity, cartData);
    },

    handleListAttrsLength: () => {
        const clLength = $('.js-classifications-length');
        if(clLength) {
            let arr = [];
            clLength.each(function() {
                arr.push($(this).data('classificationsLength'))
            });
            const val = arr.reduce((acc, i) => acc > i ? acc : i, 0);
            clLength.addClass(`classifications-length__${val}`) 
        }
    }
};

$(document).ready(function () {
    $ajaxCallEvent = true;
    ACC.product.enableAddToCartButton();
});