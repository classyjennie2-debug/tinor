ACC.autocomplete = {

    _autoload: [
        "bindSearchAutocomplete",
        "bindDisableSearch"
    ],

    bindSearchAutocomplete: function () {
        // extend the default autocomplete widget, to solve issue on multiple instances of the searchbox component
        $.widget('custom.yautocomplete', $.ui.autocomplete, {
            _create: function () {

                // get instance specific options form the html data attr
                let option = this.element.data('options');
                // set the options to the widget
                this._setOptions({
                    minLength: option.minCharactersBeforeRequest,
                    displayProductImages: option.displayProductImages,
                    delay: option.waitTimeBeforeRequest,
                    autocompleteUrl: option.autocompleteUrl,
                    source: this.source
                });

                // call the _super()
                $.ui.autocomplete.prototype._create.call(this);

            },
            options: {
                cache: {}, // init cache per instance
                focus: function () {
                    return false;
                }, // prevent textfield value replacement on item focus
                select: function (event, ui) {
                    if (ui.item) {
                        ui.item.value = ACC.sanitizer.sanitize(ui.item.value);
                        if (ui.item.url != null) {
                            window.location.href = ui.item.url;
                        }
                    }
                    return false; // prevent value replacement
                }
            },
            close: function( event ) {
                this.cancelSearch = true;
                if (event.type !== "menuselect") {
                    this._close( event );
                }
            },
            _renderMenu: function (ul, groups) {
                let that = this;
                ul.append($(`<li class="ui-suggestions" aria-label="suggestions"></li>`));
                ul.append($(`<li class="ui-products" aria-label="products"></li> `));
                ul.append($(`<li class="ui-suggestions-variants" aria-label="empty"></li>`)); // just a spacer to alighn the .ui-articles just below .ui-products
                ul.append($(`<li class="ui-variants" aria-label="variants"></li>`));
                ul.append($(`<li class="ui-suggestions-articles" aria-label="empty"></li>`)); // just a spacer to alighn the .ui-articles just below .ui-products
                ul.append($(`<li class="ui-articles" aria-label="articles"></li>`));


                $.each(groups, function (index, group) {
                    that._renderHeader(ul, group);
                    $.each(group.items, function(index, item) {
                        that._renderItemData(ul, item);
                    });
                    that._renderFooter(ul, group);
                });
            },
            _renderHeader: function (ul, group) {
                const label = group.itemCount > 0 ? ACC.text.autocompleteShowingXofY(group.itemCount, group.totalCount) : "";
                if (group.type === "autoSuggestions") {
                    ul.find(".ui-suggestions")
                        .append($(`<div><h6 class="name">${ACC.text.autocompleteSuggestions}</h6></div></div>`));
                } else if (group.type === "productResult") {
                    ul.find(".ui-products")
                        .append($(`<div><span class="ui-autocomplete-counts">${label}</span><h6 class="name">${ACC.text.autocompleteProducts}</h6></div>`));
                } else if (group.type === "variantResult") {
                    ul.find(".ui-variants")
                        .append($(`<div><span class="ui-autocomplete-counts">${label}</span><h6 class="name">${ACC.text.autocompleteVariants}</h6></div>`));
                } else if (group.type === "articleResult") {
                    ul.find(".ui-articles")
                        .append($(`<div><span class="ui-autocomplete-counts">${label}</span><h6 class="name">${ACC.text.autocompleteArticles}</h6></div>`));
                }
            },
            _renderItem: function (ul, item) {
                if (item.type === "autoSuggestion") {
                    let renderHtml = $("<a>")
                        .attr("href", item.url)
                        .append($("<div>").addClass("name").text(item.value));
                    return $("<div>")
                        .data("item.autocomplete", item)
                        .append(renderHtml)
                        .appendTo(ul.find(".ui-suggestions"));
                } else {
                  let renderHtml = $("<a>")
                    .attr("href", item.url)
                    .addClass("ui-result")
                    .append(
                      item.image
                        ? $("<figure>")
                            .addClass("thumb")
                            .append($("<img>").attr("src", item.image))
                        : null
                    )
                    .append(
                      $("<div>")
                        .addClass("name")
                        .html(ACC.sanitizer.sanitize(item.value))
                    );
                  const $container = item.type === "productResult" ? ul.find(".ui-products") : item.type === "variantResult" ? ul.find(".ui-variants") : ul.find(".ui-articles");
                  return $("<div>")
                    .data("item.autocomplete", item)
                    .append(renderHtml)
                    .appendTo($container);
                }
            },
            _renderFooter: function(ul, group) {
                if (group.type === "productResult") {
                    if (group.totalCount > 0) {
                        const url = ACC.config.encodedContextPath + '/search?text=' + encodeURIComponent(this.term) + '&type=base';
                        const label = ACC.text.autocompleteSearchAllProducts(group.totalCount);
                        ul.find(".ui-products")
                            .append($(`<div class="text-center"><a class="btn btn-secondary" href="${ url }">${ label }</a></div>`));
                    } else {
                        const escapedTerm  = $("<div>").text(this.term).html();
                        ul.find(".ui-products")
                            .append($(`<div class="ui-autocomplete-empty">`).html(ACC.text.autocompleteEmptyProducts(escapedTerm)));
                    }
                } else if (group.type === "articleResult") {
                    if (group.totalCount > 0) {
                        const url = ACC.config.encodedContextPath + '/search?text=' + encodeURIComponent(this.term) + '&type=content';
                        const label = ACC.text.autocompleteSearchAllArticles(group.totalCount);
                        ul.find(".ui-articles")
                            .append($(`<div class="text-center"><a class="btn btn-secondary" href="${ url }">${ label }</a></div>`));
                    } else {
                        const escapedTerm  = $("<div>").text(this.term).html();
                        ul.find(".ui-articles")
                            .append($(`<div class="ui-autocomplete-empty">`).html(ACC.text.autocompleteEmptyArticles(escapedTerm)));
                    }
                } else if (group.type === "variantResult") {
                    if (group.totalCount > 0) {
                        const url = ACC.config.encodedContextPath + '/search?text=' + encodeURIComponent(this.term) + '&type=variant';
                        const label = ACC.text.autocompleteSearchAllVariants(group.totalCount);
                        ul.find(".ui-variants")
                            .append($(`<div class="text-center"><a class="btn btn-secondary" href="${ url }">${ label }</a></div>`));
                    } else {
                        const escapedTerm  = $("<div>").text(this.term).html();
                        ul.find(".ui-variants")
                            .append($(`<div class="ui-autocomplete-empty">`).html(ACC.text.autocompleteEmptyVariants(escapedTerm)));
                    }
                }
            },
            source: function (request, response) {
                let self = this;
                let term = request.term.toLowerCase();
                if (term in self.options.cache) {
                    return response(self.options.cache[term]);
                }

                $.getJSON(self.options.autocompleteUrl, {term: request.term}, function (data) {
                    let autoSearchData = [];
                    let suggestions = [];
                    if (data.suggestions != null) {
                        $.each(data.suggestions, function (i, obj) {
                            suggestions.push({
                                type: 'autoSuggestion',
                                value: obj.term,
                                url: ACC.config.encodedContextPath + '/search?text=' + encodeURIComponent(obj.term)
                            });
                        });
                    }
                    autoSearchData.push({
                        type: 'autoSuggestions',
                        items: suggestions
                    });

                    let products = [];
                    if (data.products != null) {
                        $.each(data.products, function (i, obj) {
                            products.push({
                                type: 'productResult',
                                value: ACC.sanitizer.sanitize(obj.name),
                                url: ACC.config.encodedContextPath + obj.url,
                                image: (obj.images != null && self.options.displayProductImages) ? obj.images[0].url : null // prevent errors if obj.images = null,
                            });
                        });
                        if (data.products.length) {
                            autoSearchData.push({
                                type: 'productsButton',
                                label: ACC.text.autocompleteSearchAllProducts(data.totalProductCount),
                                url: ACC.config.encodedContextPath + '/search?text=' + encodeURIComponent(term) + '&type=base',
                                image: null
                            });
                        } else {
                            // no results found
                            autoSearchData.push({
                                type: 'productsNotFound',
                                label: ACC.text.autocompleteEmptyProducts(term),
                                value: term,
                                url: null
                            });
                        }
                    }

                    autoSearchData.push({
                        type: 'productResult',
                        items: products,
                        itemCount: data.products.length,
                        totalCount: data.totalProductCount,
                    });

                    let variants = [];
                    if (data.variants != null) {
                        $.each(data.variants, function (i, obj) {
                            variants.push({
                                type: 'variantResult',
                                value: ACC.sanitizer.sanitize(obj.name),
                                url: ACC.config.encodedContextPath + obj.url,
                                image: (obj.images != null && self.options.displayProductImages) ? obj.images[0].url : null // prevent errors if obj.images = null,
                            });
                        });
                        if (data.variants.length) {
                            autoSearchData.push({
                                type: 'variantsButton',
                                label: ACC.text.autocompleteSearchAllProducts(data.totalVariantCount),
                                url: ACC.config.encodedContextPath + '/search?text=' + encodeURIComponent(term) + '&type=variant',
                                image: null
                            });
                        } else {
                            // no results found
                            autoSearchData.push({
                                type: 'variantsNotFound',
                                label: ACC.text.autocompleteEmptyProducts(term),
                                value: term,
                                url: null
                            });
                        }
                    }

                    autoSearchData.push({
                        type: 'variantResult',
                        items: variants,
                        itemCount: data.variants.length,
                        totalCount: data.totalVariantCount,
                    });

                    autoSearchData.push({
                        type: 'articleSuggestions',
                        items: []
                    });

                    let articles = [];
                    if (data.articles != null) {
                        $.each(data.articles, function (i, obj) {
                            articles.push({
                                type: 'articleResult',
                                value: ACC.sanitizer.sanitize(obj.name),
                                url: obj.path != null ? (ACC.config.encodedContextPath + obj.path) : null,
                                image: (obj.previewImage != null && obj.previewImage.url != null)
                                    ? obj.previewImage.url
                                    : (ACC.config.encodedContextPath + '/_ui/tibnor/theme-redesign23/images/missing_content_755x500.jpg'),
                                term: term,
                                count: data.articles.count,
                                totalCount: data.totalArticleCount
                            });
                        });
                    }
                    autoSearchData.push({
                        type: 'articleResult',
                        items: articles,
                        itemCount: data.articles != null ? data.articles.length : 0,
                        totalCount: data.totalArticleCount != null ? data.totalArticleCount : 0,
                    });
                    self.options.cache[term] = autoSearchData;
                    return response(autoSearchData);
                });
            }

        });

        const $search = $('.js-site-search-input');
        const fakeInput = $('.js-fake-search');
        if ($search.length > 0) {
            $search.yautocomplete();
        }

        fakeInput.on('click', (e) => {
            e.preventDefault();
            document.getElementById("js-site-search-input").focus();
            
            if($(".js-quick-order-panel-info").hasClass("open")) {
                ACC.common.handlePanel('quick-order-panel');
            }
        })
    },

    bindDisableSearch: function () {
        const input = $('#js-site-search-input');
        const disabledHandle = () => {
            input.val($('#js-site-search-input').val().replace(/^\s+/gm, ''));
            $('.js_search_button').prop('disabled', this.value == '' ? true : false);
        }

        input.on('keyup', disabledHandle);
        if(input.val()) {
            disabledHandle();
        }
    }
};