ACC.order = {

    _autoload: [
        "backToOrderHistory",
        "bindMultidProduct",
        "bindGroupedDeliveryDates"
    ],

    backToOrderHistory: function () {
        $(".orderBackBtn > button").on("click", function () {
            var sUrl = $(this).data("backToOrders");
            window.location = sUrl;
        });
    },

    bindMultidProduct: function () {
        // link to display the multi-d grid in read-only mode
        $(document).on("click", '.js-show-multiD-grid-in-order', function (event) {
            ACC.multidgrid.populateAndShowGrid(this, event, true);
            return false;
        });

        // link to display the multi-d grid in read-only mode
        $(document).on("click", '.showMultiDGridInOrderOverlay', function (event) {
            ACC.multidgrid.populateAndShowGridOverlay(this, event);
        });

    },

    bindGroupedDeliveryDates: function () {
        if ($(".js-cart-delivery-dates").length === 0) {
            return;
        }
        function extractDataFromHTML() {
            const deliveryDates = document.getElementsByClassName('cart-delivery-item');
            const deliveryDatesArray = [];

            for (let i = 0; i < deliveryDates.length; i++) {
                const deliveryDate = deliveryDates[i];
                const date = $(deliveryDate).find('.date').html();
                const productName = $(deliveryDate).find('.product-name').html();
                const quantity = $(deliveryDate).find('.quantity').html();
                const timestamp = $(deliveryDate).find('.timestamp').html();
              
              
                deliveryDatesArray.push({
                    date: date,
                    productName: productName,
                    quantity: quantity,
                    timestamp: parseInt(timestamp)
                });
            }
        
            deliveryDatesArray.sort(function(a, b) {
              return a.timestamp - b.timestamp;
            });
        
            return deliveryDatesArray;
          }
        
          function groupItemsByDeliveryDate(data) {
            const groupedData = {};
            for (let i = 0; i < data.length; i++) {
              const item = data[i];
              if (!groupedData[item.date]) {
                groupedData[item.date] = [];
              }
              groupedData[item.date].push(item);
            }
            return groupedData;
          }
        
          function createDeliveryDateHTML(deliveryDate, items) {
            let html = '<tr class="cart__order-summary__delivery-group"> \
                        <td colspan="2" class="cart__order-summary__delivery-group__date">' + deliveryDate + '</td></tr>';
        
            for (let i = 0; i < items.length; i++) {
              const item = items[i];
              html += '<tr><td class="cart__order-summary__delivery-group__quantity">' + item.quantity + '</td>';
              html += '<td class="cart__order-summary__delivery-group__product-name">' + item.productName + '</td></tr>';
            }
            return html;
          }
        
          const data = extractDataFromHTML();
          const groupedData = groupItemsByDeliveryDate(data);
          let html = '<table>';
          for (const deliveryDate in groupedData) {
            if (groupedData.hasOwnProperty(deliveryDate)) {
              html += createDeliveryDateHTML(deliveryDate, groupedData[deliveryDate]);
            }
          }
          document.getElementsByClassName('js-cart-delivery-dates')[0].innerHTML = html;
          $(".js-cart-delivery-dates").removeClass("hidden");
    },
};