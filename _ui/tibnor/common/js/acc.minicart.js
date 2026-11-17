ACC.minicart = {

    _autoload: [
        "updateMiniCartDisplay"
    ],

    updateMiniCartDisplay: function () {
        if (ACC.userLogged) {
            var miniCartRefreshUrl = $(".js-mini-cart-link").data("miniCartRefreshUrl");
            $.ajax({
                url: miniCartRefreshUrl,
                cache: false,
                type: 'GET',
                dataType: 'json',
                success: function ({totalPrice, totalItems}) {
                    ACC.minicart.setValue(totalPrice);
                    ACC.minicart.setCount(totalItems);
                },
                error: () => {
                }
            });
        }
    },
    setValue: function ({value, formattedValue}) {
        const miniCartLink = $(".js-mini-cart-link");
        if (miniCartLink.length === 0) {
            return;
        }
        const { miniCartItemsText, miniCartEmptyName } = miniCartLink.data();
        const text = value
          ? `<span>${miniCartItemsText}:</span> ${formattedValue}`
          : `${miniCartEmptyName}`;
        $(".js-mini-cart-link .js-mini-cart-price").html(text);
    },
    setCount: function (totalItems) {
        const count = $("<span>").addClass("nav-items-total").text(totalItems);
        $(".js-mini-cart-link .js-mini-cart-count").empty().append(count);
    }

};
