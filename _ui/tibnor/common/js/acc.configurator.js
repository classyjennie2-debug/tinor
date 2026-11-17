/*
 * Tibnor AB B2B Commerce Solution
 *
 * Copyright (c) 2018-2020. All rights reserved.
 *
 * This software is the confidential and proprietary information of Tibnor AB.
 */

var urlParams = urlParams || undefined;
ACC.configurator = {

    _autoload: [
        "bindInitialSetup"
    ],

    loader: {
        loading: false,
        button: undefined,

        start: function ($button) {
            if (this.loading) {
                if(urlParams?.logger) {
                    console.warn("Loader already started by other instance - skipping for latter", this.button, $button);
                }
                return;
            }

            this.loading = true;
            this.button = $button;
            const configurator = $(".js-cfg-loading");
            ACC.forms.startLoader(configurator, $button);
        },

        stop: function () {
            if (!this.loading) {
                return;
            }
            const configurator = $(".js-cfg-loading");
            ACC.forms.stopLoader(configurator, this.button);
            this.loading = false;
            this.button = undefined;
        },
    },

    amountSelector: {
        /**
         * Time after which the change event is triggered when plus/minus button is clicked
         */
        plusMinusDelayTimeout: 600,

        /**
         * Current delay function
         */
        _delay: undefined,

        unitSelector: {
            selector: '.js-cfg-units',

            get: function() {
                return $(this.selector);
            },

            setOptions: function(options) {
                this.get()
                    .empty()
                    .append(options);
            },

            disableProductionUnits: function () {
                let unitSelector = this.get();
                const unitBefore = unitSelector.val();
                let unitChanged = false;
                unitSelector.find('option').each(function () {
                    const unit = $(this);
                    if (unit.data('prod')) {
                        unit.attr('disabled', 'disabled');
                        if (unitBefore === unit.val()) {
                            unitChanged = true;
                        }
                    } else {
                        unit.removeAttr('disabled');
                    }
                });

                if (unitChanged) {
                    const availableUnit = unitSelector.find('option:not(disabled)').eq(0).val();
                    unitSelector.val(availableUnit).trigger('change');
                }

                return unitChanged;
            },

            selectProductionUnit: function () {
                const unitSelector = this.get();
                const unitChanged = unitSelector.val() !== 'pieces';
                unitSelector.find('option').each(function () {
                    const unit = $(this);
                    if (unit.data('prod')) {
                        unit.removeAttr('disabled');
                    }
                });

                if (unitChanged) {
                    unitSelector.val('pieces').trigger("change");
                }
                unitSelector.find('option:selected').siblings().attr('disabled', 'disabled');

                return unitChanged;
            },
        },

        scheduleChangeTrigger: function ($quantitySelector) {
            if (this._delay !== undefined) {
                clearTimeout(this._delay);
            }

            // disable other inputs
            const inputs = getElementsFromActiveCfg('.js-cfg-units, .js-cfg-amount');
            inputs.attr('disabled', 'disabled');

            this._delay = setTimeout(function () {
                $quantitySelector.trigger('change');
            }, this.plusMinusDelayTimeout);
        },

        enable: function () {
            this.setDisabled(false);
        },

        disable: function () {
            this.setDisabled(true);
        },

        setDisabled: function (disable) {
            const addToCartInputs = getElementsFromActiveCfg('.js-cfg-amount-minus, .js-cfg-amount, .js-cfg-amount-plus, .js-cfg-units');
            if (disable) {
                addToCartInputs.attr('disabled', 'disabled');
            } else {
                addToCartInputs.removeAttr('disabled');
                ACC.configurator.calculateTabIndex();
            }
        },

        bind: function () {
            $(document).on('change', '.js-cfg-amount', function (e) {
                if (ACC.configurator.selectedProduct) {
                    const $target = $(e.target);
                    ACC.configurator.loader.start($target);
                    ACC.configurator.amountSelector.disable();
                    $('.js-cfg-rounded-message, .js-cfg-rounded-min-message, .js-cfg-changed-message').addClass('hidden');

                    $target.val($target.val()
                        .replace(/,/g, '.')
                        .replace(/^([^.]*\.)(.*)$/, function (a, b, c) {
                            return b + c.replace(/\./g, '');
                        }));
                    const quantity = $target.val();
                    if (quantity) {
                        const unit = $target.parents('.js-unit-qty-form').find('.js-cfg-units').val();
                        const data = {
                            'productCode': ACC.configurator.selectedProduct.productData.code.toString(),
                            'quantity': quantity.toString(),
                            'unitCode': unit
                        };

                        $.ajax({
                            'type': 'POST',
                            'url': ACC.config.encodedContextPath + '/rest/products/roundQuantity',
                            'data': JSON.stringify(data),
                            'contentType': 'application/json',
                            'headers': {
                                'CSRFToken': ACC.config.CSRFToken
                            },
                            success: function (data) {
                                let step = 1;
                                if (unit !== 'pieces') {
                                    step = data.unitQuantityStep;
                                }
                                $target.val(data.quantity).data('step', step);

                                if (data.roundedToMinOrderableQuantity) {
                                    $('.js-cfg-rounded-min-message').removeClass('hidden');
                                } else if (data.rounded) {
                                    $('.js-cfg-rounded-message').removeClass('hidden');
                                }
                                ACC.configurator.quantityUpdated = true;

                                let processingOptions = JSON.stringify(ACC.configurator.collectCartData(undefined));
                                ACC.configurator.updateProductPrice(processingOptions);
                            },
                            error: function ({status}) {
                                ACC.configurator.amountSelector.enable();
                                ACC.navigation.handleSessionError(data, 403);
                            }
                        });
                    }
                }
            });

            $(document).on("keydown", '.js-cfg-amount', function (e) {
                if (e.which >= 48 && e.which <= 57) { // numbers
                } else if (e.which >= 96 && e.which <= 105) { // numpad numbers
                } else if (e.which === 8 || e.which === 46 || e.which === 37 || e.which === 39 || e.which === 9) { // basckspace, delete, arrows, tab
                } else if (e.key === "." || e.key === ",") {
                } else if (e.ctrlKey || e.metaKey) { // control keys
                } else {
                    e.preventDefault();
                    if (e.which === 13) {
                        $(this).trigger('change');
                    }
                }
            });

            $(document).on('click', '.js-cfg-amount-minus', function (e) {
                const cfgAmount = $(e.target).parents('.js-cfg-content').find('.js-cfg-amount');

                let value = Number(cfgAmount.val()) * 100;
                const step = cfgAmount.data('step') * 100;

                if (value > 0) {
                    value = Math.round(value - step);
                    cfgAmount.val(value / 100);
                    ACC.configurator.amountSelector.scheduleChangeTrigger(cfgAmount);
                }
            });

            $(document).on('click', '.js-cfg-amount-plus', function (e) {
                const cfgAmount = $(e.target).parents('.js-cfg-content').find('.js-cfg-amount');

                const step = cfgAmount.data('step') * 100;
                const max = cfgAmount.attr('max');
                let value = Number(cfgAmount.val()) * 100;

                if ((max && value < max * 100) || !max) {
                    value = Math.round(value + step);
                    cfgAmount.val(value / 100);
                    ACC.configurator.amountSelector.scheduleChangeTrigger(cfgAmount);
                }
            });

            $(document).on('change', '.js-cfg-units', function (e) {
                const desiredUnit = $(this).val();
                const unit = ACC.currentUnit;
                // No-op change (e.g. preferred-unit dropdown already matches): bail BEFORE disabling, otherwise inputs are locked with no AJAX to re-enable them.
                if (desiredUnit === unit) {
                    return;
                }
                ACC.configurator.loader.start($(this));
                $('.js-cfg-rounded-message, .js-cfg-rounded-min-message, .js-cfg-changed-message').addClass('hidden');
                ACC.configurator.amountSelector.disable();

                if (desiredUnit !== unit) {
                    const cfgAmount = $(e.target).parents('.js-cfg-content').find('.js-cfg-amount');
                    const quantity = cfgAmount.val();

                    const data = {
                        'productCode': ACC.configurator.selectedProduct.productData.code.toString(),
                        'quantity': quantity.toString(),
                        'unitCode': unit.toString(),
                        'desiredUnitCode': desiredUnit.toString()
                    };

                    $.ajax({
                        'type': 'POST',
                        'url': ACC.config.encodedContextPath + '/rest/products/changeUnit',
                        'data': JSON.stringify(data),
                        'contentType': 'application/json',
                        'headers': {
                            'CSRFToken': ACC.config.CSRFToken
                        },
                        success: function (data) {
                            ACC.currentUnit = desiredUnit;
                            cfgAmount.val(data.quantity).trigger('change');

                            $('.js-cfg-changed-message').removeClass('hidden');
                        },
                        error: function (data) {
                            ACC.navigation.handleSessionError(data, 403);
                        }
                    });
                }
            });
        },
    },

    products: [],
    currentProducts: [],
    selectedProduct: {},
    selectedOptions: {},
    currentUnit: '',
    productSurfaces: [],
    productCutting: [],
    customPrices: {},
    useProduction: false,
    isViewItemGA4Sent: !($(".js-cfg-product-details").length),
    priceUpdated: false,
    quantityUpdated: false,
    lowCo2ProductsOnly: false,

    bindInitialSetup: function () {
        if ($('.js-cfg').length > 0) {
            ACC.configurator.loadPreferredUnit();
            ACC.configurator.generateAttributes();
            ACC.configurator.generateProductionOptions();
            ACC.configurator.selectSingleVariant();
            ACC.configurator.bindConfiguratorUI();
            ACC.configurator.setParamsFromUrl();
            ACC.configurator.bindCustomerPrice();
        }
        ACC.configurator.amountSelector.bind();
        ACC.configurator.bindProductionGlobalUI();
    },

    bindedProductionUI: false,
    bindedAddToCart: false,
    activeCfg: undefined,

    generateAttributes: function () {
        var classifications = {
            features: [],
            attributes: []
        };

        if (variants[0].classifications) {
            variants[0].classifications.forEach(function (classification)
            {
                classifications.attributes = classifications.attributes.concat(classification.attributes);
                classifications.features = classifications.features.concat(classification.features);
            }
            );
        }

        var code;
        var i, j;

        for (i = 0; i < classifications.features.length; i++) {
            code = classifications.attributes[i].code;
            code = code.substr(code.lastIndexOf('.') + 1);
            var attribute = '<div class="configurator__row js-cfg-row" data-id="' + code + '">' +
                '<h3 class="configurator__option">';

            var icon = classifications.attributes[i].icon;

            if (icon) {
                attribute += '<img src="' + icon + '" alt="' + classifications.features[i].name + '" class="configurator__option__icon">';
            }

            attribute += classifications.features[i].name;
            var unit = classifications.features[i].featureUnit;
            if (!!unit) {
                attribute += ' <span>(' + unit.symbol + ')</span>';
            }
            attribute += '</h3><div class="configurator__values js-cfg-values"></div></div>';
            $(attribute).appendTo('.js-cfg-attributes');

            ACC.configurator.selectedOptions[code] = {
                name: classifications.features[i].name,
                icon: icon,
                featureUnit: unit ? unit.symbol : '',
            }
        }

        var product = {};
        var tempValue = 0;
        var tempWidth = 0;
        var tempLength = 0;

        variants.forEach(el => {
            const product = {
                code: el.code,
                features: el.classifications?.map(({features}) => features[0]) || [],
                remnant: false,
                inLocalStorage: el.inLocalStorage,
                attributes: {},
                shapeCode: el.shapeCode,
                lowCo2: el.lowCO2Impact,
            };
            if(urlParams?.logger && !el.classifications) {
                console.log(`No classification(s) in ${el.code} (base product ${el.baseProduct}).`);
            }

            product.features.forEach(feature => {
                code = feature.code;
                code = code.substr(code.lastIndexOf('.') + 1);
                tempValue = feature.featureValues[0]?.value || 0;
                product.attributes[code] = tempValue.toString();
            });

            ACC.configurator.products.push(product);
        });

        for (i = 0; i < remnants.length; i++) {
            tempWidth = remnants[i].width > 0 ? remnants[i].width.toString() + ' ' : '0';
            tempLength = remnants[i].length > 0 ? remnants[i].length.toString() + ' ' : '0';
            // ' ' above is added to avoid duplicate values on variant and remnant width/height
            // on the storefront side it looks the same, from calculation perspective these values are different
            product = {
                code: remnants[i].product.code,
                features: remnants[i].product.classifications.map(({ features }) => features[0]),
                remnant: true,
                remnantData: {
                    batchNumber: remnants[i].batchNumber,
                    remark: remnants[i].remark,
                    numberOfConfirmedScraps: remnants[i].numberOfConfirmedScraps,
                    deliveryTimeMessage: remnants[i].deliveryTimeMessage,
                    width: tempWidth,
                    length: tempLength
                },
                attributes: {},
                shapeCode: remnants[i].product.shapeCode,
            };

            for (j = 0; j < product.features.length; j++) {
                code = product.features[j].code;
                code = code.substr(code.lastIndexOf('.') + 1);
                tempValue = product.features[j].featureValues[0].value;
                tempValue = tempValue ? tempValue : 0;
                product.attributes[code] = tempValue.toString();
            }

            if (product.remnantData.width !== '0') {
                product.attributes.width = product.remnantData.width;
            }

            if (product.remnantData.length !== '0') {
                product.attributes.length = product.remnantData.length;
            }

            ACC.configurator.products.push(product);
        }

        ACC.configurator.generateCfgRow();

        const queryString = window.location.search;
        const urlParams2 = new URLSearchParams(queryString);
        const productId = urlParams2.get('vc');

        if(!productId) {
            ACC.track.trackViewItemGA4(variants[0]);
        }
    },

    generateCfgRow: function (onlyLocalStocked, showRemnants, lowCo2) {
        $('.js-cfg-row').each(function () {
            var row = $(this);

            var index = $(this).index();
            var id = $(this).data('id');
            var values = [];
            var value, label, item;

            if (lowCo2) {
                ACC.configurator.lowCo2ProductsOnly = true;
            }
            else {
                ACC.configurator.lowCo2ProductsOnly = false;
            }

            const products = lowCo2 ? ACC.configurator.products.filter(p => !p.remnant && p.lowCo2) : ACC.configurator.products.filter(p => !p.remnant);
            const productsR = lowCo2 ? ACC.configurator.products.filter(p => p.remnant && p.lowCo2) : ACC.configurator.products.filter(p => p.remnant);

            for (i = 0; i < products.length; i++) {
                if(products[i].features[index]) {

                    if (
                        !ACC.enforceLocalStorage ||
                        (
                            ACC.enforceLocalStorage &&
                            (!onlyLocalStocked ||
                                (products[i].inLocalStorage && onlyLocalStocked)
                            )
                        )
                    ) {
                        value = `${products[i].features[index].featureValues[0].value}`;
                        if (id === "length" && value === "0") {
                            label = ACC.runningLength;
                        } else {
                            label = value;
                        }

                        if (values.indexOf(value) < 0) {
                            values.push(value);
                            item = '<button class="configurator__value js-cfg-btn" data-val="' + value + '">' + label + '</button>';
                            $(item).appendTo($(this).find(".js-cfg-values"));
                        }
                    }
                }
            }

            if (id === 'width') {
                var valuesW = [];

                for (i = 0; i < productsR.length; i++) {
                    value = productsR[i].remnantData.width;
                    if (value !== '0' && valuesW.indexOf(value) < 0) {
                        valuesW.push(value);

                        item = '<button class="configurator__value configurator__value--highlight invisible js-cfg-btn js-cfg-remnant" data-val="' + value + '">' + value + '</button>';
                        $(item).appendTo(row.find('.js-cfg-values'));
                    }
                }
            }

            if (id === 'length') {
                var valuesL = [];

                for (i = 0; i < productsR.length; i++) {
                    value = productsR[i].remnantData.length;
                    if (value !== '0' && valuesL.indexOf(value) < 0) {
                        valuesL.push(value);

                        item = '<button class="configurator__value configurator__value--highlight invisible js-cfg-btn js-cfg-remnant" data-val="' + value + '">' + value + '</button>';
                        $(item).appendTo(row.find('.js-cfg-values'));
                    }
                }
            }

            if(showRemnants){
                row.find('.js-cfg-remnant').removeClass('invisible');
            }

            if (row.find('.js-cfg-btn').length === 1) {
                // setTimeout(function () {
                    row.find('.js-cfg-btn').trigger('click');
                // }, 300);
            }

            ACC.configurator.sortNodes(row);
        });
    },

    loadPreferredUnit: function () {
        if (ACC.userLogged) {
            $.ajax({
                'type': 'GET',
                'url': ACC.config.encodedContextPath + '/rest/customer/preferredUnit',
                success: function (data) {
                    if (data) {
                        ACC.currentUnit = data;
                    }
                }
            })
        }
    },

    generateProductionOptions: function () {
        if(ACC.userLogged) {
            var i;
            var surfaces = '<option selected></option>';
            var surfaceUrl = ACC.config.encodedContextPath + '/rest/configurations/surfaceColourTypes';
            var cuttingUrl = ACC.config.encodedContextPath + '/rest/configurations/cutting';
            var sfCuttingUrl = ACC.config.encodedContextPath + '/rest/configurations/scratchFreeCutting';

            $.ajax({
                'type': 'GET',
                'url': surfaceUrl,
                success: function (surfaceData) {
                    if (surfaceData.length > 0) {
                        ACC.configurator.productSurfaces = surfaceData;
                        for (i = 0; i < surfaceData.length; i++) {
                            surfaces += '<option value="' + surfaceData[i].code + '">' + surfaceData[i].name + '</option>';
                        }

                        $('.js-cfg-surfaces').empty();
                        $(surfaces).appendTo('.js-cfg-surfaces');
                    }
                }
            });

            $.ajax({
                'type': 'GET',
                'url': cuttingUrl,
                success: function (cuttingData) {
                    if (cuttingData.length > 0) {
                        ACC.configurator.productCutting = cuttingData;
                        ACC.configurator.filterCuttingData();
                    }
                }
            });
    
            $.ajax({
                'type': 'GET',
                'url': sfCuttingUrl,
                success: function (sfCuttingData) {
                    if (sfCuttingData) {
                        if (!sfCuttingData.lengthEnabled) {
                            $('.js-cfg-sfcut-length').val('').attr('disabled', 'disabled');
                        } else {
                            $('.js-cfg-sfcut-length').removeAttr('disabled');
                        }
    
                        if (!sfCuttingData.positiveToleranceEnabled) {
                            $('.js-cfg-sfcut-plus-tol').val('').attr('disabled', 'disabled');
                        } else {
                            $('.js-cfg-sfcut-plus-tol').removeAttr('disabled');
                        }
    
                        if (!sfCuttingData.negativeToleranceEnabled) {
                            $('.js-cfg-sfcut-minus-tol').val('').attr('disabled', 'disabled');
                        } else {
                            $('.js-cfg-sfcut-minus-tol').removeAttr('disabled');
                        }
    
                        if (!sfCuttingData.cutAngleAEnabled) {
                            $('.js-cfg-sfcut-angle-a').val('').attr('disabled', 'disabled');
                        } else {
                            $('.js-cfg-sfcut-angle-a').removeAttr('disabled');
                        }
    
                        if (!sfCuttingData.cutAngleBEnabled) {
                            $('.js-cfg-sfcut-angle-b').val('').attr('disabled', 'disabled');
                        } else {
                            $('.js-cfg-sfcut-angle-b').removeAttr('disabled');
                        }
                    }
                }
            });
        }
    },

    filterCuttingData: function() {
        const matform = ACC.configurator.selectedProduct?.productData?.shapeCode;

        if(matform) {
            let cutting = '<option selected></option>';
            let cuttingVisible = '';
            const ind = Object.keys(ACC.cutting.matforms).findIndex(key => key === matform) + 1


            ACC.configurator.productCutting.forEach(({ cutType, cuttingCode }) => {
                if (ACC.cutting.isCuttingOptionVisible(matform, cutType)) {
                    const path = '/_ui/shared/images/newcutting/';
                    const img = `matform${ind}-cuttype-${cutType.toLowerCase()}`;

                    cutting += `<option value="${cuttingCode}">${cutType}</option>`;
                    cuttingVisible += `
                        <div class="configurator__production__select__item js-cfg-select-item" data-val="${cuttingCode}">
                            <button></button>
                            ${cutType}
                            <figure><img src="${path}${img}-1.png" alt="" /></figure>
                            <figure><img src="${path}${img}-2.png" alt="" /></figure>
                        </div>`;
                }
            });

            ACC.configurator.cloneCuttingForm($('body'))
    
            $('.js-cfg-cut-type, .js-cfg-cut-type-visible').empty();
            $('.js-cfg-cut-type').hide();
            $(cutting).appendTo('.js-cfg-cut-type');
            $(cuttingVisible).appendTo('.js-cfg-cut-type-visible');
        }
    },

    cloneCuttingForm: function (container, show) {
        const clone = $('.js-cfg-cutting').clone();
        
        $('.js-cfg-cutting').remove();
        clone.addClass('hidden').find('input:disabled').removeClass('error');
        container.append(clone);

        if(show) {
            $('.js-cfg-cutting').removeClass('hidden')
        }
    },

    checkCuttingOptions: function (typeName) {
        var type = ACC.configurator.productCutting.find(({ cutType }) => cutType === typeName);

        if (type) {
            if (!type.lengthEnabled) {
                $('.js-cfg-sfcut-length').val('').attr('disabled', 'disabled');
            } else {
                $('.js-cfg-cut-length').removeAttr('disabled');
            }

            if (!type.positiveToleranceEnabled) {
                $('.js-cfg-cut-plus-tol').val('').attr('disabled', 'disabled');
            } else {
                $('.js-cfg-cut-plus-tol').removeAttr('disabled');
            }

            if (!type.negativeToleranceEnabled) {
                $('.js-cfg-cut-minus-tol').val('').attr('disabled', 'disabled');
            } else {
                $('.js-cfg-cut-minus-tol').removeAttr('disabled');
            }

            if (!type.cutAngleAEnabled) {
                $('.js-cfg-cut-angle-a').val('').attr('disabled', 'disabled');
            } else {
                $('.js-cfg-cut-angle-a').removeAttr('disabled');
            }

            if (!type.cutAngleBEnabled) {
                $('.js-cfg-cut-angle-b').val('').attr('disabled', 'disabled');
            } else {
                $('.js-cfg-cut-angle-b').removeAttr('disabled');
            }
        }
    },

    selectSingleVariant: function () {
        if (variants.length === 1) {
            ACC.configurator.currentProducts = ACC.configurator.products;
            ACC.configurator.selectProduct(0);
        }
    },

    setParamsFromUrl: function () {
        if(urlParams?.logger) {
            console.log(urlParams);
        }

        if(urlParams) {
            Object.keys(urlParams).forEach(function(key) {
                if(key === 'vc') {
                    ACC.configurator.getVariantOptions(urlParams[key]);
                } else if(key !== 'logger') {
                    if(urlParams[key]) {
                        $('.js-cfg-row[data-id="' + key + '"]').find('.js-cfg-btn[data-val="' + urlParams[key] + '"]').trigger('click');
                    }
                }
            });
        }
    },

    getVariantOptions: function (variantId) {
        if(urlParams?.logger) {
            console.log('Variant ID: ' + variantId);
        }
        var variant = $.grep(variants, function(e){ return e.code === variantId; })[0];

        if(variant) {
            if(urlParams?.logger) {
                console.log('Preselected variant: ');
                console.log(variant);
            }
            var options = variant.classifications;
            var code = '';
            var value = '';

            for(var i = 0; i < options.length; i++) {
                if(urlParams?.logger) {
                    console.log('Preselected variant options: ');
                    console.log(options);
                }
                code = options[i].attributes[0].code;
                value = options[i].features[0].featureValues[0].value;

                if(urlParams?.logger) {
                    console.log('==> PS => code: ' + code + ' value: ' + value);
                }
                if(code && value) {
                    if(urlParams?.logger) {
                        console.log('selected');
                    }
                    if(!ACC.configurator.checkIfAllOptionsSelected()){
                        $('.js-cfg-row[data-id="' + code + '"]').find('.js-cfg-btn[data-val="' + value + '"]').trigger('click');
                    }
                }
            }
        }
    },

    filterProducts: function (id, value) {
        var options = [];
        var currentOption = {};

        if (value !== '') {
            currentOption[id] = value;
        }

        delete ACC.configurator.selectedProduct;
        ACC.configurator.isViewItemGA4Sent = false;

        Object.entries(ACC.configurator.selectedOptions).forEach(function([key, val]){
            ACC.configurator.selectedOptions[key].value = undefined;
        });

        $('.js-cfg-row.with-value').each(function () {
            var id = $(this).data('id');
            var value = "" + $(this).data('value');
            var option = {};

            option[id] = value;
            options.push(option);

            ACC.configurator.selectedOptions[id].value = value;
        });

        if(urlParams?.logger) {
            console.log('options values:');
            console.log(options);
        }

        ACC.configurator.currentProducts = ACC.configurator.products.slice(0);

        if (ACC.configurator.products.length > 1) {
            for (var i = 0; i < options.length; i++) {
                Object.keys(options[i])
                    .forEach(function eachKey(key) {
                        var filteredProducts = ACC.configurator.currentProducts.filter(function (product) {
                            return ACC.configurator.lowCo2ProductsOnly ? ((product.attributes[key] === options[i][key]) && product.lowCo2) : product.attributes[key] === options[i][key];
                        });

                        ACC.configurator.currentProducts = filteredProducts.slice(0);
                    });
            }

            if(urlParams?.logger) {
                console.log('filtered products:');
                console.log( ACC.configurator.currentProducts);
            }
        }

        if (ACC.configurator.currentProducts.length === 1 && ACC.configurator.checkIfAllOptionsSelected()) {
            if(ACC.configurator.currentProducts[0].remnant) {
                ACC.configurator.generateRemnants();
            } else {
                ACC.configurator.selectProduct(0);
            }
        } else if (ACC.configurator.currentProducts.length === 0) {
            ACC.configurator.disableSelectedOptions(id);
        } else {
            ACC.configurator.generateRemnants();
            ACC.configurator.clearProductDetails();
        }

        ACC.configurator.updateUI();
    },

    updateUI: function () {
        $('.js-cfg-row').each(function () {
            var row = $(this);
            var id = row.data('id');

            row.find('.js-cfg-btn').addClass('disabled');

            var values = [];
            var vLength = 0;

            for (var i = 0; i < ACC.configurator.currentProducts.length; i++) {
                var value = ACC.configurator.currentProducts[i].attributes[id];

                if (values.indexOf(value) < 0) {
                    values.push(value);
                }
            }

            vLength = values.length;

            row.find('.js-cfg-btn').each(function () {
                var button = $(this);
                var value = "" + button.data('val');

                if (values.indexOf(value) >= 0) {
                    button.removeClass('disabled');
                    if(vLength === 1 && !button.hasClass('selected')) {
                        button.trigger('click');
                    }
                }
            });
        });
    },

    disableSelectedOptions: function(rowId) {
        $('.js-cfg-row').each(function () {
            var row = $(this);
            var id = row.data('id');

            if (id !== rowId) {
                row.find('.js-cfg-btn').each(function () {
                    var button = $(this);
                    if (button.hasClass('selected')) {
                        button.trigger('click');
                    }
                });
            }
        });
    },

    selectProduct: function (id, quantity) {
        if(ACC.configurator.checkIfAllOptionsSelected() && ACC.configurator.currentProducts[id]) {
            var requestUrl;

            if(urlParams?.logger) {
                console.log(ACC.configurator.currentProducts);
            }

            ACC.configurator.selectedProduct = ACC.configurator.currentProducts[id];
            var remnant = ACC.configurator.selectedProduct.remnant;

            if(urlParams?.logger) {
                console.log("selected product");
                console.log(ACC.configurator.currentProducts[id]);
                console.log("remnant: ", remnant);
            }

            if (remnant) {
                requestUrl = ACC.config.encodedContextPath + '/rest/remnants/' + ACC.configurator.selectedProduct.remnantData.batchNumber;
            } else {
                requestUrl = ACC.config.encodedContextPath + '/rest/products/product/' + ACC.configurator.selectedProduct.code;
            }

            $.ajax({
                'type': 'GET',
                'url': requestUrl,
                success: function (data) {
                    if (ACC.configurator.selectedProduct) {
                        if (remnant && data) {
                            ACC.configurator.selectedProduct.productData = data.product;
                        } else if (data) {
                            ACC.configurator.selectedProduct.productData = data;
                        }

                        ACC.configurator.updateProductDetails(quantity);
                        ACC.configurator.updateProductPrice();
                        ACC.configurator.filterCuttingData();
                        ACC.imagegallery.updateGallery(data.images);

                        if(!ACC.userLogged) {
                            ACC.track.trackViewItemGA4(ACC.configurator.selectedProduct.productData, quantity);
                        }

                        history.pushState(null, null, location.pathname + '?vc=' + ACC.configurator.selectedProduct.code)
                    }
                }
            })
        }
    },

    checkIfAllOptionsSelected: function () {
        var allOptions = true;

        $('.js-cfg-row').each(function () {
            if (!$(this).hasClass('with-value')) {
                allOptions = false;
                return false;
            }
        });

        return allOptions;
    },

    generateRemnants: function () {
        var product = {};
        var remnant = '';
        var remnantsAmount = 0;
        var width = 0;
        var length = 0;
        var visible = false;
        var allOptions = ACC.configurator.checkIfAllOptionsSelected();

        var jsRemnantsList = $('.js-cfg-remnants-list');
        jsRemnantsList.empty();

        if (allOptions) {
            for (var i = 0; i < ACC.configurator.currentProducts.length; i++) {
                product = ACC.configurator.currentProducts[i];

                if (product.remnant && $('.js-cfg-remnants-btn').is(':checked')) {
                    remnantsAmount += 1;
                    visible = true;
                    width = product.remnantData.width !== '0' ? product.remnantData.width : product.attributes.width;
                    length = product.remnantData.length !== '0' ? product.remnantData.length : product.attributes.length;

                    remnant = '<tr>\n' +
                        '<td><button class="configurator__btn js-cfg-remnant-btn" data-id="' + i + '" data-quantity="' + product.remnantData.numberOfConfirmedScraps + '"></button></td>\n' +
                        '<td>' + product.remnantData.batchNumber.toString().replace(/^0+/, '') + '</td>\n' +
                        '<td>' + product.remnantData.deliveryTimeMessage + '</td>\n' +
                        '<td>' + product.remnantData.numberOfConfirmedScraps + '</td>\n' +
                        '<td class="text-right">' + product.remnantData.remark + '</td>\n' +
                        '</tr>';

                    $(remnant).appendTo(jsRemnantsList);
                }
            }
        }

        if (visible) {
            $('.js-cfg-remnants').removeClass('hidden');
        } else {
            $('.js-cfg-remnants').addClass('hidden');
        }

        setTimeout(function () {
            if (remnantsAmount > 0) {
                $('.js-cfg-remnant-btn').eq(0).trigger('click');
            } else {
                if (allOptions) {
                    ACC.configurator.selectProduct(0);
                }
            }
        }, 300);
    },

    clearProductDetails: function () {
        $('.js-cfg-content, .js-cfg-prod-details').addClass('disabled');
        $('.js-cfg-production, .js-cfg-certificate').removeClass('hidden');
        $('.js-cfg-price-info').toggleClass('hidden', !ACC.userLogged);
        $('.js-cfg-price-asterisk-info').removeClass('show');
        $('\
            .js-cfg-price-list, \
            .js-cfg-price-campaign, \
            .js-cfg-price-info-cart, \
            .js-cfg-price, \
            .js-cfg-unit, \
            .js-cfg-details, \
            .js-cfg-success, \
            .js-cfg-error, \
            .js-customer-price-options \
        ').addClass('hidden');
        $('.js-cfg-amount').val(1).trigger('change');

        $('.js-cfg-loading .js-product-stock').empty();
    },

    updateShowPrice: function () {
        var jsCfgProdDet = $('.js-cfg-prod-details');
        if(jsCfgProdDet.length) {
            var product = ACC.configurator.selectedProduct?.productData;
            if (product?.campaignProduct) {
                $('.js-cfg-price-campaign').removeClass('hidden');
            }
            if (product?.campaignProduct || !!ACC.userLogged) { 
                $('.js-cfg-price-info-cart, .js-cfg-price').removeClass('hidden');
            }
            else {
                $('.js-cfg-price-info-cart, .js-cfg-price').addClass('hidden');
            }
        
            if(product){
                if (!product.campaignProduct && !!ACC.userLogged) {
                    $('.js-cfg-price-campaign').addClass('hidden');
                    $('.js-cfg-price-list').removeClass('hidden');
                }
                else if(!product.campaignProduct && !ACC.userLogged) {
                    $('.js-cfg-price-campaign').addClass('hidden');
                    $('.js-cfg-price-list').addClass('hidden');
                }
                
                if (product.buyable) {
                    if (ACC.userLogged) {
                        $('.js-cart-login').addClass('hidden');
                        $('.js-cfg-add-to-cart, .js-cfg-cancel, .js-cfg-btn-favorite').removeClass('hidden');
                    } else {
                        $('.js-cart-login').removeClass('hidden');
                        $('.js-cfg-add-to-cart, .js-cfg-cancel, .js-cfg-btn-favorite').addClass('hidden');
                    }
                    $('.js-cfg-buyable').addClass('hidden');
                } else {
                    $('.js-cfg-add-to-cart, .js-cart-login, .js-cfg-cancel, .js-customer-price-options, .js-cfg-btn-favorite').addClass('hidden');
                    $('.js-cfg-buyable').removeClass('hidden');
                }

                let $favBtn = ACC.configurator.activeCfg.find(".js-cfg-btn-favorite");
                if ($favBtn) {
                    $favBtn.toggleClass("selected", product.favorite);
                }
            }
        }
    },

    updateProductDetails: function (quantity, changeQuantity = true) {
        let sProduct = ACC.configurator.selectedProduct;
        let product = sProduct?.productData;

        $('.js-cfg-details, .js-cfg-success, .js-cfg-error').addClass('hidden');

        if(!$('.js-cart-login').length && !!sProduct)
            $('.js-cfg-prod-details').removeClass('disabled');
        
        const availableUnitCodes = product.availableUnits.filter((unit) => !unit.productionOnly).map((unit) => unit.code);
        if (!availableUnitCodes.includes(ACC.currentUnit)) {
            ACC.currentUnit = product.defaultUnit.code;
        }

        let units = '';
        for (let i = 0; i < product.availableUnits.length; i++) {
            const availableUnit = product.availableUnits[i];

            let attr = ` data-prod="${availableUnit.productionOnly}"`;
            if (availableUnit.productionOnly) {
                attr += ' disabled="disabled"';
            } else if (availableUnit.code === ACC.currentUnit) {
                attr += ' selected'
            }

            units += `<option value="${availableUnit.code}" ${attr}>${availableUnit.name}</option>`;
        }

        if (sProduct.remnant) {
            const piecesName = product.availableUnits
                .find((unit) => unit.code === 'pieces')
                ?.name;
            units = `<option value="pieces" selected>${piecesName}</option>`;
            $('.js-cfg-prod-details').addClass('hidden');
        } else {
            $('.js-cfg-prod-details').removeClass('hidden');
        }

        this.amountSelector.unitSelector.setOptions(units);
        const jsCfgAmount = getElementsFromActiveCfg('.js-cfg-amount');
        if (changeQuantity) {
            jsCfgAmount.val(quantity || 1).trigger('change');
        }

        if(quantity) {
            jsCfgAmount.attr('max', quantity);
        } else {
            jsCfgAmount.removeAttr('max');
        }

        $('.js-features').empty();

        if (product.productAdditionalData && product.productAdditionalData.length > 0) {
            let productData = '';
            for (let i = 0; i < product.productAdditionalData.length; i++) {
                let productDataItem = product.productAdditionalData[i];
                let translation = '';
                if (!!(productDataItem.translation)) {
                    translation = productDataItem.translation;
                } else {
                    translation = ACC.pdp.messages[productDataItem.code];
                }
                if (productDataItem.value) {
                    productData += '<dt class="configurator__feature__title">' + translation + '</dt>' +
                        '<dd class="configurator__feature__value">' + productDataItem.value + (!!productDataItem.unit ? " " + productDataItem.unit : "") + '</dd>';
                }
            }
            $(productData).appendTo('.js-features');

            $('.js-art-code').text(product.productAdditionalData[0].value);
            $('.js-create-product-ticket').attr('data-id' , product.productAdditionalData[0].value);
            
            if(product.lowCO2Impact) {
                $('.js-lowCO2').removeClass('hidden');
            } else {
                $('.js-lowCO2').addClass('hidden');
            }
        }

        $('.js-cfg-content').removeClass('disabled');
        $('.js-cfg-price-info').addClass('hidden');

        ACC.configurator.updateShowPrice();

        if (product.materialStatus && product.materialStatus.message) {
            $('.js-cfg-material-status').html(product.materialStatus.message).removeClass('hidden');
        } else {
            $('.js-cfg-material-status').addClass('hidden');
        }

        $('.js-cfg-trigger').each(function() {
            let trg = $(this);
            if (trg[0].type === 'checkbox' && trg.is(':checked')) {
                trg.trigger('click');
            }
        });

        const showHideHandler = (cond, className) => {
            if (cond) {
                $(`.${className}`).show().removeClass('hidden');
              } else {
                $(`.${className}`).hide();
              }
        }
        const isCuttingA = ACC.cutting.isCuttingOptionVisible(product.shapeCode, 'A');
        const isCuttingTypes = ACC.cutting.isCuttingType(product.shapeCode);
        const isSpliting = ACC.cutting.isCuttingOptionVisible(product.shapeCode, 'DE');

        if (
          product.cutting ||
          product.splitting ||
          product.scratchFreeCutting ||
          product.sheetMetalProcessing ||
          product.surfaceTreatment
        ) {
          $(".js-cfg-production").removeClass("disabled"); // production additional-btn

          const showCuttingOptions =
            (product.cutting && (isCuttingA || isCuttingTypes)) ||
            (product.splitting && isSpliting) ||
            product.scratchFreeCutting ||
            product.sheetMetalProcessing;

        showHideHandler(showCuttingOptions, "js-cfg-cuttingOpt");
        showHideHandler(product.cutting && isCuttingA, "js-cfg-production-cutA");
        showHideHandler(product.cutting && isCuttingTypes, "js-cfg-production-cut");
        showHideHandler(product.splitting && isSpliting, "js-cfg-production-split");
        showHideHandler(product.scratchFreeCutting, "js-cfg-production-sfcut");
        showHideHandler(product.sheetMetalProcessing,"js-cfg-production-sheetproc");
        showHideHandler(product.surfaceTreatment, "js-cfg-surface");

        } else {
          $(".js-cfg-production").addClass("disabled");
        }

        const productAttributes = sProduct.attributes;
        if (productAttributes) {
            $('.js-cfg-surface-width').val(productAttributes.width);
            $('.js-cfg-surface-length').attr('max', productAttributes.length).val(productAttributes.length);
        }

        if (product.certificationOptions?.length) {
            if (product.certificationOptions.length > 2) {
                $('.js-cfg-certificate-select').removeClass('hidden');

                let certificates = '<option value="-" selected>-</option>';
                for (let i = 0; i < product.certificationOptions.length; i++) {
                    let certificationOption = product.certificationOptions[i];
                    certificates += `<option value="${certificationOption.code}">${certificationOption.name}</option>`;
                }
                $('.js-cfg-certificates').empty();
                $(certificates).appendTo('.js-cfg-certificates');
            }
            $('.js-cfg-certificate').removeClass('hidden');
        } else {
            $('.js-cfg-certificate').addClass('hidden');
        }
        
        $('.js-cfg-details, .js-cfg-prod-details').removeClass('hidden');

        ACC.refinements.getProdStocks(ACC.configurator.selectedProduct.productData.code);
    },

    calculateTabIndex: () => {
        let tabIndex = 1;
        $('.js-tab-index').each(function(){
            $(this).attr('tabIndex', tabIndex);
            tabIndex++;
        });
    },

    bindCo2Information: function () {
        $(document).on('click', '.js-show-co2-lightbox', function (e) {
            e.preventDefault();

            $.colorbox({
                title: $('.js-co2-popup-title').html(),
                href: $('.js-co2-popup'),
                inline: true, 
                opacity: 0.7,
                width: '500px',
                maxWidth: '100%',
                maxHeight: '100%',
                close: '',
                onComplete: function () {
                    $.colorbox.resize();
                }
            });
        });
    },


    bindCustomerPrice: function () {
        $(document).on('click', '.js-open-customer-price', function (e) {
            e.preventDefault();
            
            $.colorbox({
                title: $('.js-customer-price-popup-title').html(),
                href: '.js-customer-price-popup',
                inline: true, 
                opacity: 0.7,
                width: '500px',
                maxWidth: '100%',
                maxHeight: '100%',
                close: '',
                onComplete: function () {
                    $('#cboxTitle').addClass('configurator__details__customer__price__title');
                    $('#cboxLoadedContent').css({'padding': '0 15px 20px', 'width': 'auto'});
                }
            });
        });
    },

    handleCustomerPriceOption: function (index, count, unit) {
        const data = ACC.configurator.customPrices;
        const item = data.prices[index - count];
        const unitName = data.units[unit];
        let info;
        const priceLevel = item && item.priceLevels[unit];
        if(priceLevel) {
            const asterisk = '';
            const qty = priceLevel.quantity;
            const price = priceLevel.formattedPrice;
            info = '<b>'+ qty + ' ' + unitName + ':</b><strong class="configurator__details__customer__price__option__counted">' + price + '/' + unitName + asterisk + "</strong>";
        }

        const optionEl = getElementsFromActiveCfg(".js-customer-price-option-" + count);
        customToggleClass(optionEl, "hidden", !item);
        customToggleClass(optionEl.parent(), "hidden", !item);
        optionEl.html(info);
    },

    calculateCustomerPrice: function (qty) {
        const { unitCode, prices, units, formattedValue } = ACC.configurator.customPrices || {};
        const cfgAmount = getElementsFromActiveCfg('.js-cfg-amount');
        const maxAmount = cfgAmount.attr('max');
        const quantity = qty || cfgAmount.val();

        if (!units[unitCode]) { // falling lenth remnant
            const {isSurcharge} = ACC.configurator.customPrices || {};
            let symbol = isSurcharge ? "*" : "";
            return {
                price: formattedValue,
                symbol: symbol
            }
        }

        let i = prices.findIndex(function(item){
            return +quantity >= item.priceLevels[unitCode]?.quantity;
        });
        if(quantity == 1 && i === -1) {
            i = prices.length - 1;
        }

        const asterisk = '';
        const price = formattedValue || "--";
        let symbol = '/ ' + units[unitCode] + asterisk;
        
        customToggleClass(
            getElementsFromActiveCfg(".js-customer-price-options"),
            "hidden",
            i < 1 || maxAmount === "1"
        );
        customToggleClass(
            getElementsFromActiveCfg(".js-cfg-price-asterisk-info"),
            "show",
            prices?.[i]?.surcharge
        );

        ACC.configurator.handleCustomerPriceOption(i, 1, unitCode);
        ACC.configurator.handleCustomerPriceOption(i, 2, unitCode);
        
        return {
            price: String(price).replace('.', ','), 
            symbol: symbol
        };
    },

    setCustomerPrice: function (qty) {
        const { prices } = ACC.configurator.customPrices || {};
        const {isViewItemGA4Sent, selectedProduct, priceUpdated, quantityUpdated} = ACC.configurator;

        if(prices) {
            const priceObj = ACC.configurator.calculateCustomerPrice(qty);
            getElementsFromActiveCfg('.js-cfg-price').text(priceObj.price);
            getElementsFromActiveCfg('.js-cfg-unit').text(priceObj.symbol).removeClass('hidden');
        } else {
            getElementsFromActiveCfg('.js-cfg-price').text('--');
        }

        if(!isViewItemGA4Sent && selectedProduct && priceUpdated && quantityUpdated) {
            ACC.track.trackViewItemGA4(ACC.configurator.selectedProduct, qty);
            ACC.configurator.isViewItemGA4Sent= true;
            ACC.configurator.priceUpdated = false;
            ACC.configurator.quantityUpdated = false;
        }
    },

    handleCustomerPriceTable: function(data) {
        data.isSurcharge = data.prices.findIndex(function(item){
            return item.surcharge;
        }) > -1;
        data.colsInTable = Object.keys(data.units).length + 1;
        var ordersTpl = $('#customerPriceTableRow').html();
        var template = Handlebars.compile(ordersTpl);
        var pricesList = template({data: data});
        $('.js-customer-price-table').empty().append(pricesList);
    },

    handleSelectedProductInfo: function(arr) {
        var options =  ACC.configurator.selectedOptions;
        var attrs = arr || Object.values(options)
        var ordersTpl = $('#showSelectedProduct').html();
        var template = Handlebars.compile(ordersTpl);
        var productData = template({selectedAttrs: attrs});
        $('.js-selected-product').empty().append(productData);
    },

    updateProductPrice: function (entry) {
        let entryData = entry;
        if(!entry)
        {
            entryData = {};
        }
        const {productData} = ACC.configurator.selectedProduct;
        
        if (typeof productData.carbonFootprint === 'number' && productData.carbonFootprint > 0) {
            $('.js-co2-container').removeClass('hidden');
            $('.js-show-co2-value').text(String(productData?.carbonFootprint.toFixed(3)));
        } else {
            $('.js-co2-container').addClass('hidden');
        }

        if(ACC.userLogged){
            let productUrl, code;
            const { remnant } = ACC.configurator.selectedProduct;
            if (remnant) {
                productUrl = ACC.config.encodedContextPath + '/rest/remnants/' + ACC.configurator.selectedProduct.remnantData.batchNumber;
                entryData = undefined;
            } else {
                code = ACC.configurator.selectedProduct.productData.code || ACC.configurator.selectedProduct.code;
                productUrl = ACC.config.encodedContextPath + '/rest/products/product/' + code;
            }

            var selectedUnit = getElementsFromActiveCfg('.js-cfg-units').children('option:selected').val();
            var quantity = getElementsFromActiveCfg('.js-cfg-amount').val();
            var priceUrl = productUrl + '/price?unit=' + selectedUnit + "&quantity=" + quantity;
            $.ajax({
                'type': remnant ? 'GET' : 'POST',
                'url': priceUrl,
                'contentType': "application/json",
                'data': entryData,
                'headers': {
                    'CSRFToken': ACC.config.CSRFToken
                },
                success: function (data) {
                    if (ACC.configurator.selectedProduct) {
                        if(data?.prices) {
                            if($('.js-customer-price-popup').length) {
                                ACC.configurator.handleCustomerPriceTable(data); // must be before .reverse()
                            }
                            data.prices.reverse();
                            ACC.configurator.customPrices = data;
                            ACC.configurator.priceUpdated = true;
                            ACC.configurator.setCustomerPrice(quantity);
                            const codeToList = remnant
                              ? `rem_${ACC.configurator.selectedProduct.remnantData.batchNumber}`
                              : ACC.configurator.selectedProduct.productData.codeWithoutZeros;
                            ACC.track.setStoredPriceList(codeToList, data.prices);
                        } else {
                            ACC.configurator.customPrices = undefined;
                        }
                        getElementsFromActiveCfg('.js-cfg-units').focus();
                    }
                    ACC.configurator.loader.stop();
                    ACC.configurator.amountSelector.enable();
                },
                error: function () {
                    ACC.configurator.customPrices = undefined;
                    ACC.configurator.loader.stop();
                    ACC.configurator.amountSelector.enable();
                }
            })
        } else {
            ACC.configurator.loader.stop();
            ACC.configurator.amountSelector.enable();
        }
    },

    createDatepicker: function (datePickerIdentifier = '.js-cfg-date', callback = null) {
        const jsDatePicker = $(datePickerIdentifier);

        if(jsDatePicker.length){
            jsDatePicker.datepicker('destroy');
            var lang = jsDatePicker.data('lang');

            ACC.common.setCalendarLocale(lang);

            if(ACC.userLogged) {
                ACC.configurator.findDeliveryDates(jsDatePicker, null, lang, callback);
            }
        }
    },

    findDeliveryDates: function (datePicker, documentNumber = null, lang, callback = null) {
        function getJointDeliveryDates(date) {
            if (ACC.cartData?.combinedDeliveryDate) {
                const combinedDeliveryDate = new Date(ACC.cartData.combinedDeliveryDate);
                const calendarDate = new Date(date);
                calendarDate.setHours(0,0,0,0);
                combinedDeliveryDate.setHours(0,0,0,0);
                const isJointDelivery = calendarDate.getTime() >= combinedDeliveryDate.getTime();
                return isJointDelivery ? "ui-datepicker-joint-delivery" : "";
            }
            return "";
        }

        function setDefaultDates() {
            var possibleDays = [1, 2, 3, 4, 5];

            datePicker.datepicker({
                firstDay: 1,
                minDate: 2,
                beforeShowDay: function (date) {
                    return [($.inArray(date.getDay(), possibleDays) > -1), getJointDeliveryDates(date)];
                }
            });

            datePicker.datepicker($.datepicker.regional[lang]);
        }

        $.ajax({
            'type': 'GET',
            'url': ACC.config.encodedContextPath + (documentNumber == null ? '/rest/cart/deliveryDays' : '/rest/order/details/quote/' + documentNumber + '/deliveryDays'),
            'contentType': 'application/json',
            'headers': {
                'CSRFToken': ACC.config.CSRFToken
            },
            success: function (data) {
                if (data) {
                    datePicker.datepicker('destroy');
                    const lang = datePicker.data('lang');
                    const calendarDate = datePicker.data('date') || data[0].date;
                    const excludedDays = data.map(({ formattedDate }) => formattedDate);
                    const nextDeliveryDate = new Date(data[0].date);
                    const setDate = new Date(calendarDate);

                    ACC.common.setCalendarLocale(lang);

                    datePicker.datepicker({
                        setDate,
                        firstDay: 1,
                        minDate: nextDeliveryDate,
                        beforeShowDay: function (date) {
                            const formattedDate = $.datepicker.formatDate('yy-mm-dd', date);
                            return [$.inArray(formattedDate, excludedDays) !== -1,getJointDeliveryDates(date)]
                        },
                        onSelect: function(dateText) {
                            $('.js-cfg-date-display').text(dateText);
                            $(this).change();
                         }
                    });

                    if (!!ACC.cartData?.combinedDeliveryDate) {
                        $(".js-joint-delivery-legend").removeClass("hidden");
                    }

                    datePicker.datepicker($.datepicker.regional[lang]);
                } else {
                    setDefaultDates(datePicker);
                }
            },
            error: function () {
                setDefaultDates(datePicker);
            },
            complete: function () {
                var langToStandard = datePicker.data('lang').replace('_', '-');
                $('.js-cfg-date-show').text(datePicker.datepicker('getDate')?.toLocaleDateString(langToStandard));
                $('.js-cfg-date-display').text(datePicker.datepicker('getDate')?.toLocaleDateString(langToStandard));
                $('.js-cfg-calendar-selected').removeClass('hidden');
                if (callback) {
                    callback();
                }
            }
        });
    },

    confirmDateSelection: function () {
        var datePicker = $('.js-cfg-date');
        var langToStandard = datePicker.data('lang').replace('_', '-');

        $('.js-cfg-date-show').text(datePicker.datepicker('getDate')?.toLocaleDateString(langToStandard));
    },


    sortNodes: function (row) {
        var items = Array.prototype.slice.call(row.find('.js-cfg-btn'));

        function compareSimple(a, b) {
            if (!isNaN(Number(a)) && !isNaN(Number(b))) {
                if (Number(a) > Number(b))
                    return -1;
                if (Number(a) < Number(b))
                    return 1;
            }
            else
            {
                if (a > b)
                    return -1;
                if (a < b)
                    return 1;
            }

            return 0;
        }

        function compareComposite(a, b) {
            if (typeof a != 'string' || typeof b != 'string') {
                return compareSimple(a,b);
            } else {
                var aSplit = a.split(' ');
                var bSplit = b.split(' ');
                var minLength = Math.min(aSplit.length, bSplit.length);
                for(var i=0; i<minLength; ++i) {
                    var comparisonResult = compareSimple(aSplit[i],bSplit[i]);
                    if (comparisonResult != 0)
                        return comparisonResult;
                }
                if (aSplit.length > bSplit.length)
                    return -1;
                if (aSplit.length < bSplit.length)
                    return 1;
            }

            return 0;
        }

        function compare(a, b) {
            return compareComposite(a.innerText, b.innerText);
        }

        items.sort(compare);

        items.forEach(function (item, idx) {
            if (idx > 0)
                item.parentNode.insertBefore(item, items[idx - 1]);
        });
    },

    calculateTolerance: function (cuttingType, cuttingLength) {
        var defaultTol = 0;
        var valueList = [];

        if (cuttingType === 'A') {
            defaultTol = (0.1 * Math.floor(10 * cuttingLength / 5000)) + 2;
            valueList = [30, 0.5, 120, 0.8, 400, 1.2, 500, 2];
        }
        else {
            defaultTol = (0.1 * Math.floor(10 * cuttingLength / 5000)) + 4;
            valueList = [30, 1, 120, 1.6, 400, 2.4, 1000, 4];
        }
        for (var i = 0; i < valueList.length / 2; i++) {
            if (cuttingLength < valueList[i * 2]) {
                defaultTol = valueList[(i * 2) + 1];
                break;
            }
        }
        return defaultTol;
    },

    resetProductionOptionsCut: function() {
        $('.js-cfg-production-type, .js-cfg-cutting').addClass('hidden');
        $('.js-cfg-production-btn').prop('checked', false);
        $('.js-cfg-production-input').val('');
        $('.js-cfg-production-options').data('type', '');

        $('.js-cfg-cut-type').prop('selectedIndex',0);
        $('.js-cfg-select-item ').removeClass('selected');
        $('.js-cfg-production-selected-cut').empty();
    },

    resetProductionOptionsView: function() {
        ACC.configurator.resetProductionOptionsCut();

        $('.js-cfg-surfaces').val('-');
        $('.js-cfg-color').addClass('hidden');
        $('.js-cfg-colors').empty();
        
        $('.js-cfg-production-selected-color').empty();
        $('.js-cfg-trigger[data-type="remove"]').addClass('hidden');
        
        // cleanUp main error
        $('.js-cfg-trigger-error').addClass('hidden');
    },

    bindProductionGlobalUI: function () {
    
        $(document).on('change', '.js-cfg-cut-type, .js-cfg-cut-length', function () {
            const type = $('.js-cfg-cut-type').val();
            const length = Number($('.js-cfg-cut-length').val());
            const tolerance = ACC.configurator.calculateTolerance(type, length);

            $('.js-cfg-cut-plus-tol, .js-cfg-cut-minus-tol').val(tolerance);
        });

        ACC.configurator.bindCo2Information();

        $(document).on('change', '.js-cfg-sfcut-length', function () {
            const length = Number($(this).val());
            const tolerance = ACC.configurator.calculateTolerance('AR', length);

            $('.js-cfg-sfcut-plus-tol, .js-cfg-sfcut-minus-tol').val(tolerance);
        });

        $(document).on('change', '.js-cfg-cut-type', function () {
            const obj = $(this);
            const index = obj.prop('selectedIndex');
            const selectedName = obj.find('option').eq(index).text();

            $(document).find('.js-cfg-cut-code').val(selectedName);

            ACC.configurator.checkCuttingOptions(selectedName);
        });

        $(document).on('click', '.js-cart-edit-entry', function (e) {
            // Remove class from quick date button if present
            $('.js-cfg-date-confirm').removeClass('js-cfg-date-confirm-and-edit');
            e.preventDefault();
            ACC.configurator.confirmDateSelection();
        });

        $(document).on('click', '.js-cfg-date-confirm', function (e) {
            e.preventDefault();
            ACC.configurator.confirmDateSelection();
        });

        $(document).on('click', '.js-cfg-date-confirm-and-edit', function (e) {
            e.preventDefault();
            $('.js-cart-edit-update').click();
        });

        $(document).on('click', '.js-cfg-quick-date', function (e) {
            e.preventDefault();

            // Open configurator below calendar
            $(this).parents('.cart__item__cell').find('.js-cart-edit-entry').click();

            // Get date from button
            const date = $(this).text();

            // Set proposed date in datepicker
            setTimeout(function () {
                $('.js-cfg-date').datepicker("setDate", new Date(date));
                $('.js-cfg-date-show').text(date);
                $('.js-cfg-date-display').text(date);
            }, 650);

            // Add different class to confirm button
            $('.js-cfg-date-confirm').addClass('js-cfg-date-confirm-and-edit');
            

        });

    },

    bindProductionUI: function () {
        if(!ACC.configurator.bindedProductionUI) {
            $('.js-cfg-production-options').on('click', '.js-cfg-production-btn', function () {
                var index = $(this).val();
                var currentType = $('.js-cfg-production-options').data('type');
    
                if(index !== currentType) {
                    $('.js-cfg-production-options').data('type', index);
    
                    if (index < 2) {
                      $(".js-cfg-select-item").each(function () {
                        var val = $(this).data("val");
                        if (
                          (val === "A" && parseInt(index)) ||
                          (val === "GK" && !parseInt(index))
                        ) {
                          $(this).addClass("hidden");
                        } else {
                          $(this).removeClass("hidden");
                        }
                      });
                    } else {
                      $(".js-cfg-select-item").addClass("hidden");
                    }
    
                    var selectedType = $('.js-cfg-production-type').eq((parseInt(index) || 1) - 1)
                    selectedType.removeClass('hidden').siblings().addClass('hidden');
    
                    var text = $(this).next().text();
                    $('.js-cfg-production-selected-cut').text(text);
                }
            });
    
            $('.js-cfg-trigger').on('click', function () {
                const $btn = $(this);
                ACC.configurator.loader.start($btn);

                const isRemove = $btn.data('type') === 'remove';
                if(!isRemove && ACC.configurator.validationProductionForms()){
                    return;
                }

                $('.js-cfg-production-options').removeAttr('data-type');
                $('.js-cfg-trigger[data-type="remove"]').toggleClass('hidden', isRemove);

                $('.js-cfg-production-selected-cut, .js-cfg-production-selected-color').toggleClass('hidden', isRemove);
                ACC.configurator.useProduction = !isRemove;

                let unitChanged = false;
                if (isRemove) {
                    unitChanged = ACC.configurator.amountSelector.unitSelector.disableProductionUnits();
                    ACC.configurator.resetProductionOptionsView();
                } else {
                    unitChanged = ACC.configurator.amountSelector.unitSelector.selectProductionUnit();
                    ACC.common.handlePanel('production-panel');
                }
    
                if (!unitChanged) {
                    const data = JSON.stringify(ACC.configurator.collectCartData(undefined));
                    ACC.configurator.updateProductPrice(data);
                }
            });

            $('.js-cfg-surfaces').on('change', function () {
                var index = $(this).prop('selectedIndex');
                var availableColors = index > 0 ? ACC.configurator.productSurfaces[index - 1].availableSurfaceColors : [];
                var colors = '';

                var text = $('.js-cfg-surfaces option:selected').text();
                $('.js-cfg-production-selected-color').text(text);

                $('.js-cfg-colors').empty();

                if (availableColors.length > 0) {
                    for (var i = 0; i < availableColors.length; i++) {
                        colors += '<option value="' + availableColors[i].code + '" data-color="' + availableColors[i].colourCode + '">' + availableColors[i].name + '</option>';
                    }
                    $(colors).appendTo('.js-cfg-colors');
                    $('.js-cfg-color').removeClass('hidden');
                } else {
                    $('.js-cfg-color').addClass('hidden');
                }
            });

            $('.js-cfg-colors').select2({
                minimumResultsForSearch: 10,
                width: '100%',
                templateResult: function(state) {
                    if (!state.id) {
                        return state.text;
                    }
                    const color = $(state.element).data("color");
                    return $('<div class="colorprefix" style="--color: ' + color + '">' + state.text + '</div>');
                },
                templateSelection: function(state) {
                    if (!state.id) {
                        return state.text;
                    }
                    const color = $(state.element).data("color");
                    return $('<div class="colorprefix" style="--color: ' + color + '">' + state.text + '</div>');
                }
            });

            $('.js-cfg-cut-type-visible').on('click', '.js-cfg-select-item', function () {
                const item = $(this);
                const indexType = $('.js-cfg-production-options').data('type');
                
                if(indexType < 2 && !item.hasClass('selected')) {
                    item.addClass('selected').siblings().removeClass('selected');
    
                    // cleanUp inputs only if Production is not set
                    if(!ACC.configurator.useProduction) {
                        $('.js-cfg-cutting').find('input').val('');
                    }
    
                    const index = item.index();
                    $('.js-cfg-cut-type').prop('selectedIndex', index + 1).trigger('change');
    
                    ACC.configurator.cloneCuttingForm(item, true);
                }
            });

            ACC.configurator.bindedProductionUI = true;
        }
    },

    validationProductionForms: function(){
        var notFilled;
        var inputs = '.js-cfg-production-type:not(.hidden) .js-cfg-production-input';
        var productionType = $('.js-cfg-production-options').data('type');
        var surfaces = $('.js-cfg-surfaces').val();

        if (!productionType && !surfaces) {
            $('.js-cfg-trigger-error').removeClass('hidden');
            return true;
        }

        $(inputs).removeClass('error');
        $(inputs+':not([disabled])').each(function(){
            if(!$(this).val()) {
                notFilled = true;
                $(this).addClass('error');
                $('.js-cfg-trigger-error').removeClass('hidden');
            } else {
                $(this).removeClass('error');
            }
        });
        if(!notFilled) {
            $('.js-cfg-trigger-error').addClass('hidden');
        }
        return notFilled;
    },

    collectCartData: function (wrapper) {
        let formData = {};
        let formFields = [];

        let quantity = "1";
        let unit = ACC.currentUnit;
        let rowMark = undefined;

        if (wrapper) {
            quantity = wrapper.find('.js-cfg-amount').val();
            unit = wrapper.find('.js-cfg-units').val();
            rowMark = wrapper.find('.js-cfg-rowmark').val();
        }

        var packingInfo = $('.js-cfg-packinginfo').val();
        var surfaceTreatment = $('.js-cfg-surfaces').val();
        var surfaceColor = $('.js-cfg-colors').val();
        var date = $('.js-cfg-date').datepicker('getDate');

        date = $.datepicker.formatDate('yy-mm-dd', date);

        quantity = quantity.toString().replace(/,/g, '.');
        quantity = Number(quantity);

        var data = {
            'quantity': quantity,
            'unitCode': unit.toString(),
            "desiredDeliveryDate": date
        };

        if ($('.js-cfg-certificate-input').is(":checked")) {
            data.certificationOption = '3M';
        }

        if (rowMark) {
            data.rowMark = rowMark;
        }

        if (packingInfo) {
            data.packingInfo = packingInfo;
        }

        if(ACC.configurator.useProduction) {
            if (surfaceTreatment) {
                data.surfaceTreatment = {};
                data.surfaceTreatment.colourType = surfaceTreatment;

                if (surfaceColor) {
                    data.surfaceTreatment.colour = surfaceColor;
                }
            }

            var productionType = parseInt($('.js-cfg-production-options').data('type'), 10);

            if (productionType === 0 || (productionType && productionType === 1)) {
                formFields = $('.js-cfg-cutting').serializeArray();

                $(formFields).each(function (index, obj) {
                    formData[obj.name] = obj.value;
                });

                data.cutting = formData;
                data.cutting.cuttingCode = $('.js-cfg-cut-type').val();
            }

            if (productionType && productionType === 2) {
                formFields = $('.js-cfg-sfcutting').serializeArray();

                $(formFields).each(function (index, obj) {
                    formData[obj.name] = obj.value;
                });

                data.cutting = formData;
            }

            if (productionType && productionType === 3) {
                data.splitting = true;
            }

            if (productionType && productionType === 4) {
                formFields = $('.js-cfg-surface').serializeArray();

                $(formFields).each(function (index, obj) {
                    formData[obj.name] = obj.value.toString();
                });

                data.sheetProcessing = formData;
            }
        }

        return data;
    },

    getCartForGiosg: function() {
        $.ajax({
            'type': 'GET',
            'url': ACC.config.encodedContextPath + '/rest/cart',
            'contentType': 'application/json',
            'headers': {
                'CSRFToken': ACC.config.CSRFToken
            },
            success: function (data) {
                if (data) {
                    var giosg_currency = data.totalPrice.currencyIso;
                    var giosg_products = data.entries.map(function(entry) {
                        return {
                            name: entry.remnant ? entry.remnant.name : entry.product.name,
                            price: entry.basePrice.value,
                            quantity: entry.modificationQuantity,
                            description: 'Unit: '+ entry.modificationUnit.name + ' [' + entry.modificationUnit.code +']',
                            product_number: entry.remnant ? entry.remnant.remnantCode : entry.product.codeWithoutZeros
                        }
                    });
                    ACC.giosg.submitProducts(giosg_currency, giosg_products)
                }
            }
        });
    },

    bindAddToCart: function () {
        if(!ACC.configurator.bindedAddToCart) {
            $(document).on('click', '.js-cfg-btn-favorite', function() {
                const $btn = $(this);
                $btn.data("product-code", ACC.configurator.selectedProduct.productData.code.toString());
                ACC.favorites.toggleFavorite($btn);
            });
            $(document).on('click', '.js-cfg-add-to-cart', function (e) {
                e.preventDefault();
                
                if(ACC.configurator.useProduction && ACC.configurator.validationProductionForms()) {
                    ACC.common.handlePanel('production-panel');
                    return
                }
    
                const quickorder = !!e.target.closest(".js-quick-order-product");
                const { QUICK_ORDER, OTHER } = ACC.cart.addedFrom;

                const $this = $(this);
                const qtyWrap = $this.parent().parent().find('.js-unit-qty-form');
                let data = {
                    ...ACC.configurator.collectCartData(qtyWrap),
                    productCode: ACC.configurator.selectedProduct.productData.code.toString(),
                    addedFrom: quickorder ? QUICK_ORDER : OTHER,
                };
    
                if(!data.desiredDeliveryDate) {
                    ACC.configurator.createDatepicker();
                    ACC.common.handlePanel('calendar-cart');
                    return
                }
    
                const trackPage = ACC.track.calculateAddToCartTrackCase($(this).parents('body'))
                const configurator = $this.closest('.js-cfg-loading');
                ACC.forms.startLoader(configurator, $this);
    
                $('.js-cfg-success, .js-cfg-error').addClass('hidden');

                if (ACC.configurator.selectedProduct.remnant) {
                    data.remnantBatchNumber = ACC.configurator.selectedProduct.remnantData.batchNumber;
                }
    
                data = JSON.stringify(data);
    
                $.ajax({
                    'type': 'POST',
                    'url': ACC.config.encodedContextPath + '/rest/cart/entry',
                    'data': data,
                    'contentType': 'application/json',
                    'headers': {
                        'CSRFToken': ACC.config.CSRFToken
                    },
                    success: function (data) {
                        if (data) {
                            const { totalPrice, totalItems } = data.miniCart;
                            
                            ACC.track.trackMainAddToCartGA4(data, trackPage, quickorder);
                            ACC.minicart.setValue(totalPrice);
                            ACC.minicart.setCount(totalItems);
    
                            $('.js-cfg-text').val('');
                            $('.js-cfg-success').removeClass('hidden');
                            setTimeout(function() {
                                $.colorbox.close();
                            }, 2000);

                            ACC.configurator.createDatepicker();
                            ACC.configurator.getCartForGiosg(); 
                            ACC.configurator.useProduction = false;

                            if($('body').hasClass('page-cartPage')) {
                                ACC.common.handlePanel('quick-order-panel');
                                location.reload();
                            }
                        }
                    },
                    error: function (data) {
                        ACC.navigation.handleSessionError(data, 403);

                        var errorMessage = ACC.common.parseErrorMessages(data);
    
                        $('.js-cfg-error').html(errorMessage).removeClass('hidden');

                        if(ACC.common.hasCreditBlockError(data)) {
                            $('.js-cfg-add-to-cart').addClass('hidden')
                            $('.js-cfg-btn-favorite').addClass('hidden');
                            $('.js-cfg-error').addClass('hidden')
                            $('.js-c-block').removeClass('hidden')
                            $('.js-c-block-text').removeClass('hidden')
                        }
                    },
                    complete: function(){
                        ACC.forms.stopLoader(configurator, $this);
                    }
                });
            });

            $('.js-cfg-cancel').on('click', function (e) {
                e.preventDefault();
    
                $.colorbox({
                    href: '.js-cfg-cancel-box',
                    inline: true,
                    opacity: 0.7,
                    width: '470px',
                    maxWidth: '100%',
                    maxHeight: '100%',
                    close: '',
                    title: '',
                    onComplete: function () {
                        $('#cboxTitle').hide();
                        $('#cboxLoadedContent').css('margin-top', '20px');
                    }
                });
    
                $('.js-cfg-cancel-yes').on('click', function (e) {
                    e.preventDefault();
    
                    $('.js-cart-search-input').val('');
                    $('.js-cart-product').empty();
                    ACC.cart.bindCartBoxes();
                    $.colorbox.close();
                });
            });
    
            $('.js-cfg-cancel-no').on('click', function (e) {
                e.preventDefault();
                $.colorbox.close();
            });

            ACC.configurator.bindedAddToCart = true;
        }
    },

    resetImageGallery: function() {
        let $carousel = $('.owl-carousel');
        if ($carousel.length > 0) {
            $carousel.trigger('owl.goTo', 0);
        }
    },

    bindConfiguratorUI: function () {
        var jsCfg = $('.js-cfg');
        var jsCfgRemnantsBtn = $('.js-cfg-remnants-btn');
        var jsCfgLocalStockedBtn = $('.js-cfg-local-stocked-btn');
        var jsLowCo2Btn =  $('.js-cfg-lowCo2-btn');
        const hasLowCo2Variants = (ACC.configurator.products.filter(p => p.lowCo2).length > 0);

        if (remnants.length > 0) {
            $('.js-cfg-remnants-selector').removeClass('hidden');
        }

        if (hasLowCo2Variants)
        {
            $('.js-cfg-lowCo2-selector').removeClass('hidden');
        }

        jsCfgRemnantsBtn.on('change', function () {
            $('.js-cfg-remnant').toggleClass('invisible');
            $('.js-cfg-remnants').addClass('hidden');
        });

        jsCfgLocalStockedBtn.on('change', function () {
            const localStockedChecked = jsCfgLocalStockedBtn.is(':checked');
            const remnantsChecked = jsCfgRemnantsBtn.is(':checked');
            const lowCo2Checked = jsLowCo2Btn.is(':checked');

            $('.js-cfg-values').empty();
            ACC.configurator.generateCfgRow(localStockedChecked, remnantsChecked, lowCo2Checked);
        });

        jsLowCo2Btn.on('change', function () {
            const localStockedChecked = jsCfgLocalStockedBtn.is(':checked');
            const remnantsChecked = jsCfgRemnantsBtn.is(':checked');
            const lowCo2Checked = jsLowCo2Btn.is(':checked');

            $('.js-cfg-values').empty();
            ACC.configurator.generateCfgRow(localStockedChecked, remnantsChecked, lowCo2Checked);
        });

        jsCfg.on('click', '.js-cfg-btn', function (e) {
            e.preventDefault();

            var button = $(this);
            var value = '';
            var id = $(this).closest('.js-cfg-row').data('id');

            if (button.hasClass('selected')) {
                button.closest('.js-cfg-row').data('value', value).removeClass('with-value');
            } else {
                value = "" + button.data('val');
                button.closest('.js-cfg-row').data('value', value).addClass('with-value');
            }

            $(this).toggleClass('selected').siblings().removeClass('selected');

            ACC.configurator.filterProducts(id, value);
            ACC.configurator.handleSelectedProductInfo();
        });

        jsCfg.on('click', '.js-configurator-reset', function (e) {
            e.preventDefault();

            $('.js-cfg-btn').removeClass('selected');
            $('.js-cfg-row').removeClass('with-value');
            ACC.configurator.filterProducts();
            ACC.configurator.resetProductionOptionsView();
            ACC.configurator.handleSelectedProductInfo();
            ACC.configurator.resetImageGallery();
            
            $('.js-cfg-prod-details').addClass('disabled');
            history.pushState(null, null, location.pathname)
        });

        jsCfg.on('click', '.js-cfg-remnant-btn', function (e) {
            e.preventDefault();

            var button = $(this);
            var id = parseInt(button.data('id'));
            var quantity = parseInt(button.data('quantity'));

            button.addClass('selected').closest('tr').addClass('selected');
            button.addClass('selected').closest('tr').siblings().removeClass('selected').find('.js-cfg-remnant-btn').removeClass('selected');

            ACC.configurator.selectProduct(id, quantity);
        });

        ACC.configurator.bindProductionUI();
        ACC.configurator.bindAddToCart();
        ACC.configurator.handleSelectedProductInfo();

        const cfgBox = $('.js-cfg-box');
        if (cfgBox.length) {
            ACC.configurator.activeCfg = $('.js-cfg-box');
        }

        ACC.configurator.createDatepicker();
    }
};

const getElementsFromActiveCfg = (elemnts) => {
    return ACC.configurator.activeCfg.find(elemnts)
}

const customToggleClass = (el, className, cond) => {
    cond ? el.addClass(className) : el.removeClass(className);
}