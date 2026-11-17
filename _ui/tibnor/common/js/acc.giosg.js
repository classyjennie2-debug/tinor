ACC.giosg = {
  // _autoload: [""],

  // https://developers.giosg.com/basket.html

  submitProducts: function (currency, products) {
    ACC.common.isReady("_giosg", 'onSubmitOrder', function () {
      _giosg(function () {
        giosg.api.shoppingCart.setCurrency(currency);
        giosg.api.shoppingCart.submit(products); //.then(function () {});
      });
    });
  },

  placeOrder: function () {
    ACC.common.isReady("_giosg", 'cartFreeze', function () {
      _giosg(function () {
        giosg.api.shoppingCart.freeze(); //.then(function () {});
      });
    });
  },

  visitors: function (data) {
    ACC.common.isReady("_giosg", 'visitors', function () {
      var goisgCustomerInfo = {
        name: data.name,
        email: data.email || data.uid,
        customer: ACC.config.salesOrganization,
      };
      _giosg(function () {
        giosg.api.visitor.submit(goisgCustomerInfo); //.then(success, error);
      });
    });
  },
};
