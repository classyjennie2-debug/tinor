window.dataLayer =  window.dataLayer || [];

ACC.track = {
    _autoload: [
        "trackUserLogin",
        "trackProductsListOnLoad",
        "trackBeginCheckoutGA4"
    ],

    trackUserRegistration: function () {
        window.dataLayer.push({
            'event': 'new_customer'
        });
    },

    trackLoggedUser: function (contactNumber) {
        window.dataLayer.push({
            'event': 'User_login',
            'user_ID': contactNumber
        });
    },

    trackUserLogin: function () {
        if(ACC.freshlyLoggedIn && !!window.dataLayer) {
            window.dataLayer.push({
                'event': 'Successful_login'
            });
        }
    },

    trackProductsListOnLoad: function () {
        const $list = $('.js-product__list');
        if($list.length) {
            const trackingDisabled = $list.data("product-list-track") === false;
            if (trackingDisabled) {
                return;
            }

            let { href, search} = location;
            let url = search ? href.replace("?", "/results?") : `${href}/results`;

            if($('.page-search').length) {
                const tmpSearch = search.replace('?text', '?q');
                url = '/search/results' + tmpSearch
            }

            $.ajax({
                'type': 'GET',
                'url': url,
                'contentType': 'application/json',
                'headers': {
                    'CSRFToken': ACC.config.CSRFToken
                },
                success: function (data) {
                    if(data) {
                        ACC.track.trackProductsListGA4(data, search);
                        $('.js-handlebars-clean-all-facets').attr('data-sort', data.pagination.sort)
                    }
                }
            });
        }
    },

    trackAddToCart: function (productCode, quantity, cartData) {
        window.mediator.publish('trackAddToCart', {
            productCode: productCode,
            cartData: cartData,
            quantity
        });
    },
    trackRemoveFromCart: function (productCode, initialCartQuantity) {
        window.mediator.publish('trackRemoveFromCart', {
            productCode,
            initialCartQuantity
        });
    },

    trackUpdateCart: function (productCode, initialCartQuantity, newCartQuantity) {
        window.mediator.publish('trackUpdateCart', {
            productCode,
            initialCartQuantity,
            newCartQuantity
        });
    },

    trackShowReviewClick: function (productCode) {
        window.mediator.publish('trackShowReviewClick', {});
    },

    calculateAddToCartTrackCase: function (body) {
        var actionFieldInfo = {
            cartPage: "Quick add - Cart page",
            search: "Search results page",
            productList: "Category page",
            productDetails: "Product details page",
        };

        return Object.entries(actionFieldInfo).reduce(
          (acc, entry) =>
            body.hasClass("page-" + entry[0]) ? entry[1] : acc,
          ""
        );
    },

    // HELPERS methods

    handleGA4QtyAndPrice: (unitObj, qty, priceData) => {
        const { code, unitStep } = unitObj || {};

        // if product has no priceLevel (ex. qty is less then minQty)
        const isOriginalPriceLevel = priceData?.find(p => p.priceLevels[code]?.quantity <= qty);

        const checkUnit = ["kg", "meter"].includes(code);
        let unitCode = checkUnit ? "pieces" : code;

        // if product has no pieces option
        const isPriceLevelsObj = priceData?.find(p => p.priceLevels[unitCode]);
        unitCode = isPriceLevelsObj ? unitCode : code;

        const quantity =
          isPriceLevelsObj && unitStep && qty
            ? checkUnit
              ? Math.round(qty / unitStep)
              : qty
            : 1;
        let price;
        const priceObj = priceData?.find(
          (p) => p.priceLevels[unitCode]?.quantity <= (isPriceLevelsObj ? quantity : qty)
        );

        price =
          (priceObj && +priceObj?.priceLevels[unitCode].price.toFixed(2)) || 0;
        price = isOriginalPriceLevel ? (isPriceLevelsObj ? price : price * qty) : 0;

        return { quantity, price };
    },

    handleGA4QtyForOrderLine: ({ product, unit, orderedQuantity }, prices) => {
        return ACC.track.handleGA4QtyAndPrice(
            ACC.track.getGA4UnitObj(product.availableUnits, unit.code),
            orderedQuantity,
            prices
          )
    },

    getGA4Item: ({ product, ...entry }, index) => ({
        ...ACC.track.getGA4Categories(product.categoryPath),
        item_id: product.codeWithoutZeros || `${parseFloat(product.code)}`,
        item_name: `${product.name} ${product.description}`,
        promotion_name: product.campaignProduct ? 'Outlet' : '',
        price: entry?.basePrice?.value || '',
        quantity: 1,
        index,
    }),

    getGA4Categories: (data) =>
        data?.reduce((acc, cat, i) => {
            const prop = `item_category${(i && i + 1) || ""}`;
            return { ...acc, [prop]: cat.name || cat };
        }, {}) || {},

    getGA4UnitObj: (units, c) => units.find(({ code }) => code === c),

    // EOF HELPERS methods

    trackMainAddToCartGA4: function (data, item_page_type, quickorder) {
        const { entry, quantityAdded } = data;
        const { entryNumber, product, unit } = entry;
        const unitToHandle = ACC.track.getGA4UnitObj(product.availableUnits, unit.code);
        const priceData = ACC.track.getStoredPrice(entry.product.codeWithoutZeros);

        window.dataLayer && window.dataLayer.push({
            event: 'add_to_cart',
            currency: entry.totalPrice.currencyIso,
            value: entry.totalPrice.value,
            item_quickorder: quickorder ? 'Yes' : 'No',
            item_page_type,
            order_rows: 1,
            items: [{
                ...ACC.track.getGA4Item(entry, entryNumber),
                ...ACC.track.handleGA4QtyAndPrice(unitToHandle, quantityAdded, priceData),
            }]
        });
    },

    trackViewItemGA4: function (data, qty) {
        let pricesObj = ACC.configurator.customPrices || {};
        const { value, currencyIso, unitCode, prices } = pricesObj;
        const product = data.productData || data;
        const unitToHandle = ACC.track.getGA4UnitObj(product.availableUnits, unitCode);
        window.dataLayer && window.dataLayer.push({
            event: 'view_item',
            login_user: ACC.userLogged ? 'Yes ' : 'No',
            currency: currencyIso || '',
            value: Math.round(value * qty * 100) / 100 || '',
            order_rows: 1,
            items: [
                {
                    ...ACC.track.getGA4Item({ product }, 0),
                    ...ACC.track.handleGA4QtyAndPrice(unitToHandle, qty, prices)
                }
            ]
        });
    },

    trackProductsListGA4: function (data, search) {
        const { currentPage } = data.pagination;
        const isFiltered = new URLSearchParams(search)
          .get("q")
          ?.split(":")
          ?.filter((el) => !!el)
          ?.find((el) => el !== "relevance");
        const filtered = isFiltered ? ", filtered" : "";
        const page = currentPage ? `, page - ${currentPage + 1}` : "";
        const catName =
          Object.values(
            ACC.track.getGA4Categories(data.results[0]?.categoryPath)
          ).pop()?.name || $(".breadcrumb li.active").text();

        const item_list_name = $("body").hasClass("page-search")
          ? "Search result page"
          : catName + filtered + page;
        
          window.dataLayer &&
          ACC.track
          .getPriceListFromStorage(
            data.results.map(({ codeWithoutZeros, remnant}) => [codeWithoutZeros, remnant?.batchNumber])
          )
          .then(prices => {
            window.dataLayer.push({
              event: "view_item_list",
              login_user: ACC.userLogged ? "Yes" : "No",
              currency: data.results[0]?.price?.currencyIso || "",
              item_list_name,
              view_item_list_type: ACC.config.searchMode,
              order_rows: data.results.length,
              items: data.results.map((product, index) => ({
                ...ACC.track.getGA4Item({ product }, index),
                ...ACC.track.handleGA4QtyAndPrice(
                  product.defaultUnit,
                  0,
                  prices?.[product.codeWithoutZeros]
                ),
              })),
            });
          });
    },

    trackBeginCheckoutGA4: async () => {
        if(ACC.cartData){
            const { currency, entries, value } = ACC.cartData;
            window.dataLayer && ACC.track
              .getPriceListFromStorage(
                entries.map(({ product, remnant }) => [product.codeWithoutZeros, remnant?.batchNumber])
              )
              .then((prices) => {
                window.dataLayer.push({
                  event: "begin_checkout",
                  currency,
                  value,
                  order_rows: entries.length,
                  items: entries.map((entry, index) => ({
                    ...ACC.track.getGA4Item(entry, index),
                    ...ACC.track.handleGA4QtyForOrderLine(
                      entry,
                      prices?.[entry.remnant?.batchNumber || entry.product.codeWithoutZeros]
                    ),
                    item_quickorder: entry.addedFrom,
                  })),
                });
              });
        }
    },

    trackRemoveFromCartGA4: function (id) {
        
        const entry = ACC.cartData.entries[id];

        window.dataLayer?.push({
            event: "remove_from_cart",
            currency: ACC.cartData.currency,
            value: entry.totalPrice.value,
            order_rows: 1,
            items: [
                {
                ...ACC.track.getGA4Item(entry, id),
                ...ACC.track.handleGA4QtyForOrderLine(
                    entry,
                    ACC.track.getStoredPrice(entry.product.codeWithoutZeros)
                ),
                item_quickorder: entry.addedFrom,
                },
            ],
        });
    },

    trackPurchaseGA4: function (data) {

        const { entries, totalPrice, sapDocumentNumber } = data;

        window.dataLayer?.push({
            event: "purchase",
            currency: totalPrice?.currencyIso,
            value: totalPrice?.value,
            transaction_id: sapDocumentNumber || "punchout",
            sales_org: ACC.config.salesOrganization,
            punchoutOrder: ACC.punchoutUser || "no",
            order_rows: entries.length,
            items: entries?.map((entry, index) => ({
                ...ACC.track.getGA4Item(entry, index),
                ...ACC.track.handleGA4QtyForOrderLine(
                    entry,
                    ACC.track.getStoredPrice(entry.product.codeWithoutZeros)
                ),
                item_quickorder: entry.addedFrom,
            })) || [],
        });
    },

    trackQuoteRequestGA4: function (quote_id) {
        if(ACC.cartData){
            const { currency, entries, value, id } = ACC.cartData;

            window.dataLayer?.push({
                event: "quote_request",
                currency,
                value,
                quote_id: quote_id || id,
                order_rows: entries.length,
                items: entries.map((entry, index) => ({
                    ...ACC.track.getGA4Item(entry, index),
                    ...ACC.track.handleGA4QtyForOrderLine(entry,
                        ACC.track.getStoredPrice(entry.product.codeWithoutZeros)),
                    item_quickorder: entry.addedFrom
                })),
            });
        }
    },


    /**
     * 
     * to handle price for GA4
     * in SessionStorage
     */
    setStoredPriceList: (code, list) => {
        const current = JSON.parse(sessionStorage.getItem('priceLists'));
        const newList = {
            ...current,
            [code]: list
        };
        sessionStorage.setItem('priceLists', JSON.stringify(newList));
    },

    getStoredPrice: (code) => {
        return JSON.parse(sessionStorage.getItem('priceLists'))?.[code];
    },

    collectSelectedPrices: (codes) =>
        codes?.reduce(
            (acc, [c, remnant]) => {
                const sku = remnant || c;
                return {
                    ...acc,
                    [sku]: ACC.track.getStoredPrice(sku),
                }
            }, {}
        ) || {},

    getPriceListToStorage: (codes) => {
        if(!codes.length) {
            return new Promise(r => r())
        }
        const code = codes.shift();
        const remnant = code[1];
        const sku = code[0];

        const urlPart =
          ACC.config.encodedContextPath +
          (remnant
            ? `/rest/remnants/${remnant}`
            : `/rest/products/product/${sku}`);

        var url = urlPart + "/price?unit=pieces&quantity=1";
        return new Promise(r => {
            if(!ACC.userLogged) {
                return r();
            }
            $.ajax({
                type: "GET",
                url,
                success: ({ prices }) => {
                ACC.track.setStoredPriceList(remnant || sku, prices);
                r();
                },
            });
        }).then(() => {
          return ACC.track.getPriceListToStorage(codes);
        });
    },

    /**
     * 
     * @param {[ sku, remnant ]} codes 
     */
    getPriceListFromStorage: (codes) => {
        const toGetData = codes.filter(([c, r]) => {
            const sku = r || c;
            return !!c && !ACC.track.getStoredPrice(sku)
        });

        if (toGetData.length) {
          return ACC.track.getPriceListToStorage(toGetData).then(() => {
            return ACC.track.collectSelectedPrices(codes);
          });
        } else {
          return new Promise((resolve) => {
            resolve(ACC.track.collectSelectedPrices(codes));
          });
        }
    },

    trackCloudForms: evenName => {
        if(evenName) {
            window.dataLayer?.push({
                event: evenName,
            });
        }
    },
};
