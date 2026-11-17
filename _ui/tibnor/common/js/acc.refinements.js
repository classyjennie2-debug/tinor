ACC.refinements = {

    _autoload: [
        "handlebarsHelpers",  
        "handleHandlebarsFacets",
        "bindProdListStockInfo",
        "bindGeneral",
        ["bindMoreLessToggles", $(".js-handlebars-facets").length !== 0]
    ],

    currentProdList: [],
    mobileOpenFacet: [],

    bindGeneral: function() {
        localStorage.removeItem('fullFacetsList');
    },

    bindProdListStockInfo: function () {
        if ($(".js-product-stock").length) {
            $(".js-product-stock").each(function () {
                var code = $(this).data("code");
                if(code) {
                    ACC.refinements.currentProdList.push(code.toString());
                }
            });
            ACC.refinements.getProdStocks();
        }
    },

    getProdStocks: function (sku) {
        var codes = sku || ACC.refinements.currentProdList.join(",");
        if(codes && ACC.userLogged) {
            $.ajax({
                type: "GET",
                url: ACC.config.encodedContextPath + "/rest/products/product/" + codes + "/availability",
                contentType: "application/json",
                headers: {
                    CSRFToken: ACC.config.CSRFToken,
                },
                success: function (data) {
                    $(".js-product-stock:empty").each(function () {
                        var code = $(this).data("code");

                        if(code && !sku || !code && sku ) {
                            var codeOrSku = sku || code.toString();
                            var stock = data.find(function (item) {
                                return item.product.code === codeOrSku;
                            })?.product.stock.stockLevelStatus.code;

                            if(stock) {
                                // outOfStock | lowStock | inStock
                                var out = stock === "outOfStock";
                                var typeVal = out ? "excl" : "tick";
                                var colorType = out ? "blue" : stock === "inStock" ? "green" : "yellow";

                                $(this)
                                    .text(ACC.text[stock])
                                    .prepend(ACC.global.getSvgStockInfo(typeVal, colorType))
                                    .removeClass("hidden");
                            }
                        }
                    });
                },
                error: function (data) {
                    ACC.navigation.handleSessionError(data, 400);
                }
            });
        }
    },

    bindMoreLessToggles: function () {
        $(document).on("click", ".js-more-handlebars-facets", function (e) {
            e.preventDefault();

            var container = $(this).parents(".js-facet");
            container.find(".js-facet-list li:hidden").show().attr('data-more', 'open');
            $(this).parent().hide().next().show();
        });
        $(document).on("click", ".js-less-handlebars-facets", function (e) {
            e.preventDefault();

            var container = $(this).parents(".js-facet");
            container.find(".js-facet-list li[data-more]").hide().removeAttr('data-more');
            $(this).parent().hide().prev().show();

            var fromTop = container.offset().top - $('.js-mainHeader').height();
            $('html, body').animate({scrollTop: fromTop}, 100);
        });

    },

    handlebarsFacetsMethods: {
        handleLocalStocked: (data) => {
            const localStocked = data.facets?.find(({ code }) => code === 'inLocalStorage');
            const localStockedBtn = $('body').find('.js-plp-local-stocked-btn');
            localStockedBtn.addClass('hidden');

            if(!localStocked) {
                return
            }

            const trueVal = localStocked.values.find(({ code }) => code === 'true');
            if(!trueVal) {
                return
            }
            
            localStockedBtn
              .attr("data-value", trueVal.query.value)
              .attr("data-url", trueVal.query.url)
              .removeClass("hidden")
              .prev()
              .prop("checked", trueVal?.selected);
        },
        handleFacets: (data, id) => {
            const d = {
              ...data,
              facets: data.facets
                ?.filter(
                  (f) =>
                    (f.slider && f.values.length > 1) ||
                    ["type", "grade", "surface", "lowCO2Impact"].includes(f.code)
                )
                .sort((a, b) => {
                  const nameA = a.name.toLowerCase();
                  const nameB = b.name.toLowerCase();
                  const aS = a.slider;
                  const bS = b.slider;
                  const eq = (aS || bS) && bS - aS;
                  return eq !== 0
                    ? eq
                    : nameA > nameB
                    ? 1
                    : nameB > nameA
                    ? -1
                    : 0;
                })
                .map((f) => {
                  const topVal = f.values.splice(0, ACC.config.facetTopValues);
                  const values = [
                    ...topVal,
                    ...f.values.sort((a, b) => {
                      const nameA = a.name.toLowerCase();
                      const nameB = b.name.toLowerCase();
                      const aS = a.selected;
                      const bS = b.selected;
                      return f.slider
                        ? 0
                        : aS || bS
                        ? bS - aS
                        : nameA > nameB
                        ? 1
                        : nameB > nameA
                        ? -1
                        : 0;
                    }),
                  ];
                  return { ...f, values };
                }),
            };
            const { handlebarsTpl, handleLocalStocked } = ACC.refinements.handlebarsFacetsMethods;

            handlebarsTpl(d, 'facets');
            
            d.facets = data.facets.filter(f => f.code === 'category');
            handlebarsTpl(d, 'facetsCat');
            handleLocalStocked(data);

            const val = $("body").find('[data-facet-id="' + id + '"] .js-facet-values');
            if (window.innerWidth >= 1024) {
              val.removeClass("hidden").prev().addClass("open");
            }
        },
        handlebarsTpl: (d, id, nextPage) => {
            const tpl = $('#' + id + 'Handlebars').html()
            const template = Handlebars.compile(tpl);
            const { displayPrices, showPrices, userLogged } = ACC;
            let data = {
              ...d,
              displayPrices,
              showPrices,
              userLogged
            };
            const facetObj = template({data: data});

            if(nextPage) {
                $(facetObj).insertBefore('.js-handlebars-newProducts');
            } else {
                $('.js-handlebars-' + id).html(facetObj);
            }
            if(id === 'facets') {
                ACC.refinements.sliderRange(data.facets, data.breadcrumbs);
            }
            if(id === 'products') {
                ACC.product.handleListAttrsLength();
            }
        },

        handlebarsAjaxCall: (url, callback, callbackError, trackResults = true, again) => {
            if(url) {
                if(url.includes('/search/')) {
                    url = url.replace('?text', '?q');
                }

                if (url.includes("/facets")) {
                    if (localStorage.getItem("fullFacetsList")) {
                        $(".js-handlebars-facets")
                          .addClass("progressing")
                          .prepend("<div class='loader js-loader'></div>");
                    } else {
                      if (!url.includes("/search/") && url.includes("q=")) {
                        const cleanUrl = url.slice(0, url.indexOf("q="));

                        ACC.refinements.handlebarsFacetsMethods.handlebarsAjaxCall(
                          cleanUrl,
                          callback,
                          callbackError,
                          trackResults,
                          url
                        );
                        return;
                      }
                    } 
                }

                $.ajax({
                    'type': 'GET',
                    'url': url,
                    'contentType': 'application/json',
                    'headers': {
                        'CSRFToken': ACC.config.CSRFToken
                    },
                    success: function (data) {
                        // for facets call
                        if (url.includes('/facets')) {
                            if (!(url.includes('q='))) {
                                localStorage.setItem('fullFacetsList', JSON.stringify(data));
                            }
                            if(again) {
                                ACC.refinements.handlebarsFacetsMethods.handlebarsAjaxCall(
                                    again,
                                    callback,
                                    callbackError,
                                    trackResults
                                );
                                return;
                            }
                        }

                        if (typeof callback == 'function')
                            callback(data);

                        // for results
                        if (url.includes('/results')) {
                            ACC.refinements.currentProdList = [];
                            data.results.forEach(function(r){
                                ACC.refinements.currentProdList.push(r.code)
                            })
                            if (ACC.userLogged && ACC.config.searchMode === 'variant') {
                                ACC.refinements.getProdStocks();
                            }
                            if (trackResults) {
                                ACC.track.trackProductsListGA4(data, location.search)
                            }

                            const { sort, originalQuery } = data.pagination;
                            ACC.refinements.setSortSelect(originalQuery);

                            if(originalQuery) {
                                $('.js-handlebars-clean-all-facets').attr('data-sort', sort);
                            }
                            ACC.refinements.handlebarsFacetsMethods.handleCleanAllBtn();
                        }

                        if (url.includes('/facets')) {
                            if (window.innerWidth < 1024) {
                                $('.js-facet-values').removeClass('hidden')
                                $('.js-facet').each(function(){
                                    const facetId = $(this).data('facetId');

                                    if(ACC.refinements.mobileOpenFacet.find(id => id === facetId)){
                                        $(this).addClass('active');
                                    }
                                })
                                ACC.refinements.mobileOpenFacet = [];
                            }
                        }
                    },
                    error: function () {
                        if (typeof callbackError == 'function') 
                            callbackError();
                    },
                    complete: function() {
                        $(".js-handlebars-facets")
                            .removeClass("progressing")
                            .find("js-loader")
                            .remove();
                    }
                });
            }
        },

        handleCleanAllBtn: () => {
            const btn = $('.js-handlebars-clean-all-facets');
            const sorts = ACC.refinements.getSortSelect();
            const isCampaign = sorts.includes(ACC.variables.CAMPAIGN_STRING);
            const params = sorts.split(':')

            customToggleClass(btn, 'hidden', !(params.length > (isCampaign ? 4 : 2)))
        },

        buildUrl: (dest) => {
            const search = location.search.replace('?text=', '?q=')
            return location.pathname + dest + search;
        },

        updateCallUrl: (url, dest) => {
            return url?.replace('?q=', dest + '?q=');
        }
    },

    handleHandlebarsFacets: function(){
        const {
          handlebarsAjaxCall,
          handlebarsTpl,
          updateCallUrl,
          handleCleanAllBtn,
          buildUrl,
          handleFacets,
        } = ACC.refinements.handlebarsFacetsMethods;
        
        if($(".js-handlebars-facets").length !== 0) {
            handlebarsAjaxCall(buildUrl('/facets'), function (data) {
                handleFacets(data);
                handleCleanAllBtn();
            })
        }
        
        //click on facet
        $('body').on("click", ".js-handlebars-facet", function (e) {
            const dataUrl = $(this).attr('data-url');
            const parentId = $(this).parents('.js-facet').data('facetId')

            if (window.innerWidth < 1024) {
                $('.js-facet').each(function(){
                    if($(this).hasClass('active')){
                        ACC.refinements.mobileOpenFacet.push($(this).data('facetId'))
                    }
                })
            }

            handlebarsAjaxCall(
                updateCallUrl(dataUrl, '/facets'), 
                function (data) {
                    handleFacets(data, parentId);
                    for (const [type, count] of Object.entries(data.itemsFoundPerSearchItemType)) {
                        handlebarsTpl({count: count}, 'total-results-' + type);
                    }
                }
            );

            handlebarsAjaxCall(updateCallUrl(dataUrl, '/results'), function (data) {
                history.pushState(null, null, dataUrl);
                handlebarsTpl(data, 'products');
                handlebarsTpl(data, 'pagination');
            });
        });

        $('.js-handlebars-pagination').on("click", ".js-pagination-link", function (e) {
            e.preventDefault();
            var urlTarget = $(this).attr('href');

            handlebarsAjaxCall(urlTarget.replace('?','/results?'), function (data) {
                history.pushState(null, null, urlTarget);
                handlebarsTpl(data, 'products');
                handlebarsTpl(data, 'pagination');
                
                var fromTop = $('.js-mainHeader').height() + 110;
                $('html, body').animate({scrollTop: fromTop}, 300);
            });
        });

        document.addEventListener("click", function (e) {
            if($('.js-product-facet').length && !$(e.target).hasClass('open')) {
                if(!$(e.target).parents('.js-facet').length) {
                    $('body').find('.js-facet-select.open').removeClass('open').next().addClass('hidden');
                }
            }
        }, true);

        $(document).on("click", ".js-facet-select", function () {
            const clicked = $(this)
            $('.js-facet-select').each(function() {
                if($(this)[0] === clicked[0])
                    $(this).toggleClass('open').next().toggleClass('hidden');
                else
                    $(this).removeClass('open').next().addClass('hidden');
            })
        });
        
        $(document).on("click", ".js-handlebars-clean-all-facets", function (e) {
            e.preventDefault();
            const dataSort = $(this).data('sort');

            function urlClear(url) {
                let dest = (url || '') + '?q=';
                const isSearch = location.pathname.includes('/search');

                if(isSearch) {
                    const qParams = ACC.refinements.getSortSelect().split(':');
                    dest += qParams[0]
                } else {
                    dest += ACC.variables.URL_SEPARATOR + dataSort;
                }

                return location.pathname + dest;
            }

            handlebarsAjaxCall(urlClear('/facets'), function (data) {
                handleFacets(data);
                for (const [type, count] of Object.entries(data.itemsFoundPerSearchItemType)) {
                    handlebarsTpl({count: count}, 'total-results-' + type);
                }
            });

            handlebarsAjaxCall(urlClear('/results'), function (data) {
                history.pushState(null, null, urlClear());
                handlebarsTpl(data, 'products');
                handlebarsTpl(data, 'pagination');
            });
        });
    },

    handlebarsHelpers: function(){
        Handlebars.registerHelper({
            inc: function(v1, v2) { return v1 + v2},
            dec: function(v1, v2) { return  v1 - v2},
            eq: function(v1, v2) { return  v1 === v2},
            ne: function(v1, v2) { return  v1 !== v2},
            lt: function(v1, v2) { return  v1 < v2},
            gt: function(v1, v2) { return  v1 > v2},
            not: function(v) { return !v},
            co2Format: function (v) { return Number(v).toFixed(3)},
            idFacetCleaner: function (id) {
                const re = /[\W_]/g;
                return id.replace(re, '');
            },
            getPrimaryImageUrl: function (images, format) {
                return (
                  images?.find(
                    (i) => i.imageType === "PRIMARY" && i.format === format
                  )?.url || undefined
                );
            },
            paginationStart: function (limit, pagination, halfLimit) {
                if(limit > pagination.numberOfPages) {
                    return 1
                } else if(pagination.currentPage + halfLimit >= limit) {
                    if(pagination.currentPage + halfLimit < pagination.numberOfPages){
                        if(pagination.currentPage + 1 - halfLimit > 0){
                            return pagination.currentPage + 1 - halfLimit
                        } else {
                            return 1
                        }
                    } else {
                        return pagination.numberOfPages + 1 - limit
                    }
                } else {
                    return 1
                }
            },
            pagesList: function (limit, start, numOfPages) {
                var arr = []; 
                var length  = numOfPages > limit ? limit : numOfPages;
                for (let i = 0; i < length; i++) {
                    arr[i] = start + i;
                }
                return arr
            },
            topVal: function (index, selected) {
                return !(selected || index < ACC.config.facetTopValues);
            }, 
            selectedName: function (arr) {
                const count = arr.reduce(
                  (acc, item) => (item.selected ? [...acc, item.name] : acc),
                  []
                );
                return (
                  (!count.length && ACC.text.selectDefault) ||
                  (count.length === 1 && count[0]) ||
                  `${ACC.text.selectSelected} (${count.length})`
                );
            }, 
            showLessMore: function(obj) {
                return obj.length > ACC.config.facetTopValues
            },
            getUrl: function (page) {
                let { href, search, pathname } = location;
                const p = "page=";
                const isPager = href.indexOf(p);
                const sort = ACC.refinements.getSortSelect();

                if (search) {
                  if (isPager > -1) {
                    const filtered = search
                      .split("&")
                      .filter((el) => !el.includes(p));
                    href = pathname + filtered.join("&");
                  }
                } else {
                  href += `?q=${ACC.variables.URL_SEPARATOR}${sort}`;
                }

                return `${href}&${p}${page}`;
            },
            trimString: function (str) {
                return str.length > 25
                ? new Handlebars.SafeString(str.substring(0, 20)) + "..."
                : str;
            },
            isLoginOnPriceList: (userLogged, displayPrices, showPrices) =>
              (userLogged || displayPrices) && showPrices
        });
    },

    setSortSelect: (val) => {
        // set the correct value for sorting
        $('[id*="sortForm"').each(function() {
            $(this).find('input[name="q"]').val(val);
        });
    },

    getSortSelect: () => $('body').find('[id*="sortForm"] input[name="q"]')[0]?.value, 

    sliderRange: function(facets, breadcrumbs){
        const range = $(".js-facet-range-slider");
        
        let apply;
        const applySlider = (el) => {
            if(apply) {
                clearTimeout(apply);
            }
            apply = setTimeout(() => {
                el.parents('.js-facet-range').find(".js-facet-range-btn").trigger('click');
            }, 1000);
        }

        function cleanArr( arr, code) {
            return arr.split(':').filter((a, i, ar) => a!== code && ar[i-1] !== code).join(':')
        }
                
        function createUrl(url, rangeVal, parent, code) {
            const btn = parent.find(".js-facet-range-btn");
            const q = `:${code}:${rangeVal[0]}:${code}:${rangeVal[1]}`;
            const newUrl = (location.pathname + "?q=" + cleanArr(url, code) + q).replaceAll(":", `${ACC.variables.URL_SEPARATOR}`);
            
            btn.attr("data-url", newUrl);
        }

        if (range.length) {
            const fullFacetsList = JSON.parse(localStorage.getItem('fullFacetsList'));
            range.each(function () {
                const code = $(this).attr('data-code'),
                    parent = $(this).parent();

                parent.removeClass('hidden');

                const valMin = parent.find(".js-val-range-min"),
                    valMax = parent.find(".js-val-range-max"),
                    valUnit = parent.parents('.js-facet').find(".js-val-range-unit"),

                    facet = facets.find(function(facet){
                        return facet.code === code
                    }),
                    fullFacet = fullFacetsList?.facets.find(function(facet){
                        return facet.code === code
                    }),

                    values = facet.values,
                    fullValues = fullFacet?.values,
                    useValues = fullValues || values,

                    min = useValues?.[0].code * 1,
                    max = useValues[useValues.length - 1].code * 1,

                    selectedValues = breadcrumbs.filter(breadcrumb => breadcrumb.facetCode === code)
                        .sort((a, b) => (a.facetValueCode * 1) - (b.facetValueCode * 1)),
                    minSelected = selectedValues.length ? selectedValues[0].facetValueCode * 1 : values[0].code * 1,
                    maxSelected = selectedValues.length ? selectedValues[selectedValues.length - 1].facetValueCode * 1 : values[values.length - 1].code * 1,

                    unit = facet.featureUnit.symbol || '',
                    url = values[0].query.query.value,
                    
                    sliderSelected = [minSelected, maxSelected];

                const slider = $(this).slider({
                    range: true,
                    min: min,
                    max: max + 0.0001, // fix for roundings in floats
                    step: 0.05,
                    values: sliderSelected,
                    slide: function (_, ui) {
                        valMin.val(ui.values[0]);
                        valMax.val(ui.values[1]);
                        createUrl(url, ui.values, parent, code);

                        applySlider($(this));
                    },
                    create: function () {
                        createUrl(url, sliderSelected, parent, code);
                    },
                });

                valUnit.text(unit);
                valMin.val($(this).slider("values", 0));
                valMax.val($(this).slider("values", 1));

                const rangeInput = $(parent).find( '.js-val-range');

                rangeInput.on('change', function(){
                    var isMin = $(this).hasClass('js-val-range-min');
                    var val = $(this).val().replace(',', '.');
                    var minVal = slider.slider("values", 0);
                    var maxVal = slider.slider("values", 1);

                    if (isMin) {
                        if (val > maxVal) {
                            val = maxVal;
                        }
                        if (val < min) {
                            val = min;
                        }
                    } else {
                        if (val < minVal) {
                            val = minVal;
                        }
                        if (val > max) {
                            val = max;
                        }
                    }

                    arr = [
                        isMin ? val : minVal,
                        !isMin ? val : maxVal
                    ];

                    slider.slider("option", "values", arr);
                    $(this).val(val);
                    createUrl(url, arr, parent, code);
                })

                rangeInput.on('keypress blur', (e) => {
                    if (e.key === "Enter" || e.type === 'blur') {
                        applySlider($(this));
                    }
                })
            });
          }
    }
};
