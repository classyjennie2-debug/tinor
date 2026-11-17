/*
 * Tibnor AB B2B Commerce Solution
 *
 * Copyright (c) 2018-2019. All rights reserved.
 *
 * This software is the confidential and proprietary information of Tibnor AB.
 */

ACC.cart = {

    _autoload: [
        "bindCartBoxes",
        "bindCartParams",
        "bindCartAddress",
        "bindCartEntryRemove",
        "bindCartEntryEdit",
        "bindCartClear",
        "bindDeliveryDate",
        "bindQuickOrder",
        "bindOrderSubmit",
        "bindQuoteSubmit",
        "bindPunchoutSubmit",
        "cartRestoration",
        "bindCartPage",
        "bindMultidCartProduct",
        "bindOpenSaveOrderInformation",
        "bindOrderInformationActions",
        "bindOpenSelectDeliveryDateForAllEntries",
        "bindAutoSelectDeliveryDateForAllEntries",
        "bindDesiredDeliveryDate",
        "bindSelectJointDeliveryDateFromEntry",
    ],

    addedFrom: {
        QUICK_ORDER: 'quick_order',
        OTHER: 'other'
    },

    bindedCartBoxes: false,

    
    bindOpenSaveOrderInformation: function () {
        $('.js-add-order-information').on('click', function (e) {
            e.preventDefault();

            $.colorbox({
                href: '.js-cart-info',
                inline: true,
                opacity: 0.7,
                width: '600px',
                maxWidth: '100%',
                maxHeight: '100%',
                close: '',
                title: $('.js-add-order-information-header').html(),
            });
        });
    },

    capitalizeAllTokens: function (string) {
        return string.replace(/\w\S*/g, function (txt) {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        });
    },

    bindDesiredDeliveryDate: function () {
        const previewTag = $('.js-desired-delivery-date');
        const timestamp = previewTag.data('timestamp');
        const locale = previewTag.data('locale')?.replace('_', '-');
        if (previewTag.length === 0 || !timestamp || !locale) {
            previewTag.text('-');
            return;
        }
        const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
        const date = new Date(timestamp);
        const formattedDate = date.toLocaleDateString(locale, options);
        previewTag.text(ACC.cart.capitalizeAllTokens(formattedDate));
    },

    bindOrderInformationActions: function () {
        function toggleDisableButtons(state) {
            $('.js-cart-info-save').prop('disabled', state);
            $('.js-cart-info-cancel').prop('disabled', state);
        }

        $('.js-cart-info-cancel').on('click', function (e) {
            e.preventDefault();
            $.colorbox.close();
        });

        $('.js-cart-info-save').on('click', function (e) {
            e.preventDefault();
            const fields = $(this).parents('.js-cart-info').find('.js-cart-info-field');

            const saveFieldData = (field, data, id) => {
                return new Promise ((resolve, reject) => {
                    field.prop('disabled', true);

                    $.ajax({
                        'type': 'PUT',
                        'url': ACC.config.encodedContextPath + '/rest/cart/' + id,
                        'data': data,
                        'contentType': 'application/json',
                        'headers': {
                            'CSRFToken': ACC.config.CSRFToken
                        },
                        success: function () {
                            field.addClass('valid');
        
                            setTimeout(function () {
                                $('.js-cart-info-field').removeClass('valid');
                            }, 4000)

                            setTimeout(function () {
                                field.prop('disabled', false);
                                toggleDisableButtons(false);
                                resolve();
                            }, 500)
                           
                        },
                        error: function () {
                            field.prop('disabled', false);
                            field.addClass('invalid');
                            toggleDisableButtons(false);

                            reject();
                        }
                    });
                })
            }
            const promisesData = [];

            fields.each(function() {
                const field = $(this);
                const id = field.data('id');
                let data = {};
                data.customerInput = field.val();
                data = JSON.stringify(data);
                promisesData.push({field, data, id});
            });

            toggleDisableButtons(true);

            Promise.all(promisesData.map(({ field, data, id }) => saveFieldData(field, data, id)))
            .then(() => {
                $.colorbox.close();
            });
            
        });
    },


    bindCartBoxes: function () {
        if(!ACC.cart.bindedCartBoxes) {
            $(document).on('click', '.js-cart-box-header', function () {
                $(this).toggleClass('collapsed').siblings('.js-cart-box-content').slideToggle();
            });
            
            ACC.cart.bindedCartBoxes = true;
        }
    },

    bindCartParams: function () {
        const width = $(window).width();

        if (width <= 640) {
            $('.js-cart-params').hide();
        }

        $('.js-cart-params-trigger').on('click', function () {
            $(this).toggleClass('collapsed').siblings().slideToggle();
        });
    },
    
    bindCartAddress: function () {
        const jsAddressCountry = $('.js-cart-edit-address-country');
        jsAddressCountry.val(jsAddressCountry.data('current'))

        $('.js-cart-change-address-btn').on('click', function () {
            ACC.common.addressPopup(function (code) {
                let data = {
                    'sapCode': code
                };

                data = JSON.stringify(data);

                $.ajax({
                    'type': 'POST',
                    'url': ACC.config.encodedContextPath + '/rest/cart/address',
                    'data': data,
                    'contentType': 'application/json',
                    'headers': {
                        'CSRFToken': ACC.config.CSRFToken
                    },
                    success: function () {
                        window.location.reload();
                    }
                });
            });
        });

        $('.js-cart-edit-address-btn').on('click', function () {
            const countryCode = jsAddressCountry.val() || jsAddressCountry.data('current');
            if(countryCode) {
                  ACC.cart.updateTransportZones(countryCode)
            }
        });

        $('.js-cart-edit-address-country').on('change', function () {
            const countryCode = jsAddressCountry.val();
            if(countryCode) {
                  ACC.cart.updateTransportZones(countryCode)
            }
        });


        $('.js-cart-edit-address-save').on('click', function (e) {
            e.preventDefault();

            const formFields = $('.js-cart-edit-address-form').serializeArray();

            let formData = {};
            $(formFields).each(function (index, obj) {
                formData[obj.name] = obj.value;
            });

            formData.city = $('.js-cart-edit-address-zones').find('option:selected').text();

            let dataJ = JSON.stringify(formData);

            $.ajax({
                'type': 'POST',
                'url': ACC.config.encodedContextPath + '/rest/cart/address/edit',
                'data': dataJ,
                'contentType': 'application/json',
                'headers': {
                    'CSRFToken': ACC.config.CSRFToken
                },
                success: function () {
                    window.location.reload();
                },
                error: function (data) {
                    const errorMessage = ACC.common.parseErrorMessages(data);

                    $('.js-cart-edit-address-error').html(errorMessage).removeClass('hidden');
                }
            });
        });

        $('.js-cart-edit-address-cancel').on('click', function (e) {
            e.preventDefault();
            $.colorbox.close();
        });
    },
    
    quickOrderCloseHandle: function (keepIt) {
        if (
          (!keepIt || keepIt === "quick-order-panel") &&
          $(".js-quick-order-panel-info").hasClass("open")
        ) {
            // close on PDP
            if ($("body").hasClass("page-productDetails")) {
                $(".js-quick-order-product").empty();
                $(".js-cart-search-info").removeClass('hidden');

                if($('.js-cart-search').hasClass('has-error')) {
                    $('.js-cart-search-input').val('').focus();
                    ACC.cart.resetQuickOrderForm()
                }
    
                const search = window.location.search;
                // with selected product
                if (search) {
                const urlParams = new URLSearchParams(search);
                const product = urlParams.get("vc");
                if (product) {
                    ACC.configurator.filterProducts(product);
                    ACC.configurator.handleSelectedProductInfo();
                    ACC.configurator.isViewItemGA4Sent = true;
                }
                // with selected product
                } else {
                    ACC.configurator.filterProducts();
                    ACC.configurator.resetProductionOptionsView();
                    ACC.configurator.handleSelectedProductInfo();
                }
                ACC.configurator.activeCfg = $('.js-cfg-box');
            } else {
                ACC.configurator.activeCfg = $('.js-cart-product');
            }
            
        }
    },

    updateTransportZones: function (countryCode) {
        $.ajax({
                    'type': 'GET',
                    'url': ACC.config.encodedContextPath + '/rest/sales-organization/countries/' + countryCode + '/transport_zones',
                    'contentType': 'application/json',
                    'headers': {
                        'CSRFToken': ACC.config.CSRFToken
                    },
                    success: function (data) {
                        const jsAddressZones = $('.js-cart-edit-address-zones');
                        const currentZone = jsAddressZones.data('current');
                        let zonesData = '';

                        for (let i = 0; i < data.length; i++) {
                            zonesData += '<option value="' + data[i].transportZone + '">' + data[i].description + '</option>';
                        }

                        jsAddressZones.empty();
                        $(zonesData).appendTo(jsAddressZones);
                        jsAddressZones.val(currentZone);

                        $('.js-cart-edit-address-error').text('').addClass('hidden');

                        $.colorbox({
                            href: '.js-cart-edit-address',
                            inline: true,
                            opacity: 0.7,
                            width: '700px',
                            maxWidth: '100%',
                            maxHeight: '100%',
                            close: '',
                            title: $('.js-cart-edit-address-header').html()
                        });
                    }
                });
    },

    bindCartEntryRemove: function () {
        $('.js-cart-remove-entry').on('click', function (e) {
            e.preventDefault();
            const id = $(this).data('id');

            $.colorbox({
                href: '.js-cart-remove-entry-box',
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

            $('.js-cart-cart-remove-entry-remove').on('click', function (e) {
                e.preventDefault();

                const btn = $(this);
                btn.addClass('disabled');

                $.ajax({
                    'type': 'DELETE',
                    'url': ACC.config.encodedContextPath + '/rest/cart/entry/' + id,
                    'contentType': 'application/json',
                    'headers': {
                        'CSRFToken': ACC.config.CSRFToken
                    },
                    success: function (data) {
                        ACC.track.trackRemoveFromCartGA4(id);
                        location.reload();
                    },
                    error: function () {
                        btn.removeClass('disabled');
                    }
                });
            });
        });

        $('.js-cart-cart-remove-entry-cancel').on('click', function (e) {
            e.preventDefault();
            $.colorbox.close();
        });
    },

    bindCartEntryEdit: function () {
        
        ACC.configurator.bindCustomerPrice();
        let entryId;
        let productCode;
        let remnantCode;
        $('.js-cart-edit-entry').on('click', function (e) {
            e.preventDefault();
            ACC.configurator.activeCfg = $('.js-cart-edit-entry-box')
            ACC.configurator.resetProductionOptionsView();

            $('.js-cart-product').empty().addClass('hidden');

            const item = $(this).closest('.js-cart-e');
            let requestUrl = '';
            let quantity;
            
            remnantCode = item.data('remnant');
            productCode = item.data('product');
            entryId = item.data('id');


            if (remnantCode) {
                requestUrl = ACC.config.encodedContextPath + '/rest/remnants/' + remnantCode;
            } else {
                requestUrl = ACC.config.encodedContextPath + '/rest/products/product/' + productCode;
            }

            $.ajax({
                'type': 'GET',
                'url': requestUrl,
                success: function (data) {
                    let prodData;
                    if (data && remnantCode) {
                        prodData = data.product;
                        quantity = data.numberOfConfirmedScraps;
                    } else if (data) {
                        prodData = data;
                    }
                    ACC.configurator.selectedProduct.productData = prodData


                    if (remnantCode) {
                        $('.js-cfg-production').addClass('disabled');
                        $('.js-cfg-prod-details-remnant').removeClass('hidden');

                        const { availableUnits } = prodData;
                        let piecesName = '';

                        for (let i = 0; i < availableUnits.length; i++) {
                            if (availableUnits[i].code === 'pieces') {
                                piecesName = availableUnits[i].name;
                            }
                        }

                        const units = '<option value="pieces" selected>' + piecesName + '</option>';
                        $('.js-cfg-units').empty();
                        $(units).appendTo('.js-cfg-units');
                    } else {
                        $('.js-cfg-production').removeClass('disabled');
                        $('.js-cfg-prod-details-remnant').addClass('hidden');
                    }

                    $('.js-cart-edit-entry-box').html($('#cartEditEntryBox').html());
                    $('.js-cart-panel-edit .loader').addClass('hidden');

                    ACC.configurator.updateProductDetails(quantity, false);
                    ACC.configurator.bindProductionUI();
                    ACC.cart.bindCartBoxes();

                    const { name, description, codeWithoutZeros, lowCO2Impact } = prodData;
                    const editTpl = $('#productEditTitle').html();
                    const template = Handlebars.compile(editTpl);
                    const titleData = template({
                      name,
                      description,
                      codeWithoutZeros,
                      lowCO2Impact
                    });
                    $(".js-edit-item-title").empty().append(titleData);

                    ACC.cart.showProductVariantInfo(prodData);
                    ACC.configurator.createDatepicker();

                    setDefaultValues(item, !!remnantCode);

                    ACC.configurator.generateProductionOptions();
                    ACC.configurator.updateProductPrice();
                }
            });
        });

        $(document).on('click', '.js-cart-edit-update', function (e) {
            e.preventDefault();

            const $this = $(this);
            const configurator = $this.closest('.js-cfg-loading');
            ACC.forms.startLoader(configurator, $this);

            $('.js-cfg-success, .js-cfg-error').addClass('hidden');

            const qtyWrap = $this.parent().parent().find('.js-unit-qty-form');
            let data = { 
                ...ACC.configurator.collectCartData(qtyWrap), 
                productCode
            };

            if (remnantCode) {
                data.remnantBatchNumber = remnantCode;
            }

            data = JSON.stringify(data);

            $.ajax({
                'type': 'PUT',
                'url': ACC.config.encodedContextPath + '/rest/cart/entry/' + entryId,
                'data': data,
                'contentType': 'application/json',
                'headers': {
                    'CSRFToken': ACC.config.CSRFToken
                },
                success: function () {
                    location.reload();
                },
                error: function (data) {
                    const errorMessage = ACC.common.parseErrorMessages(data);
                    $('.js-cart-edit-error').html(errorMessage).removeClass('hidden');
                },
                complete: function(){
                    ACC.forms.stopLoader(configurator, $this);
                }
            });
        });

        function setDefaultValues(item, remnant) {
            const quantity = ACC.common.parseNumber(item.find('.js-cart-e-quantity').data('value'));
            const unit = item.find('.js-cart-e-unit').data('id');
            const deliveryDate = new Date(item.find('.js-cart-e-date').data('date'));
            const rowMark = item.find('.js-cart-e-rowmark').text();
            const packingInfo = item.find('.js-cart-e-packinginfo').text();
            const langToStandard = $('.js-cfg-date').data('lang').replace('_', '-');

            ACC.currentUnit = unit;
            $('.js-cfg-units').val(unit);
            $('.js-cfg-amount').val(quantity).trigger('change');
            $('.js-cfg-rowmark').val(rowMark);
            $('.js-cfg-packinginfo').val(packingInfo);
            

            setTimeout(function () {
                $('.js-cfg-date').datepicker("setDate", deliveryDate);
                $('.js-cfg-date-show').text(deliveryDate.toLocaleDateString(langToStandard));
            }, 600);

            const certificate = item.find('.js-cart-e-certificates').data('id');
            if(certificate) {
                $('.js-cfg-certificate-input').prop('checked', true);
            }

            if (!remnant) {
                setTimeout(function () {
                    const surface = item.find('.js-cart-e-surface').text();
                    const cutting = item.find('.js-cart-e-cutting');
                    const splitting = item.find('.js-cart-e-splitting');
                    const color = item.find('.js-cart-e-color').text();

                    if (surface.length) {
                        $('.js-cfg-trigger-surf').click();
                        $('.js-cfg-surfaces').val(surface).trigger('change');

                        setTimeout(function () {
                            if (color.length) {
                                $('.js-cfg-colors').val(color);
                            }
                        }, 400);
                    }

                    if (cutting.length) {
                        const cuttingType = cutting.data('type');
                        const cutType = $('.js-cfg-cut-type');
                        const jsCfgCutTypeOption = $('.js-cfg-cut-type option');

                        const isTypeA = cuttingType === 'A';
                        const caseType = `.js-cfg-production-cut${isTypeA ? 'A' : ''}`;
                        $(caseType + ' .js-cfg-production-btn').click();

                        jsCfgCutTypeOption.removeAttr('selected');
                        jsCfgCutTypeOption.each(function() {
                            const option = $(this);

                            if(option.text() === cuttingType) {
                                option.attr('selected', 'selected');
                                cutType.trigger('change');
                           }
                        });

                        const index = cutType.prop('selectedIndex');
                        $('.js-cfg-select-item')[index-1].click();

                        const { length, ptol, mtol, anglea, angleb, lang } = cutting.data();
                        $('.js-cfg-cut-length').val(ACC.common.parseNumber(length, lang));
                        $('.js-cfg-cut-plus-tol').val(ACC.common.parseNumber(ptol, lang));
                        $('.js-cfg-cut-minus-tol').val(ACC.common.parseNumber(mtol, lang));
                        $('.js-cfg-cut-angle-a').val(ACC.common.parseNumber(anglea, lang));
                        $('.js-cfg-cut-angle-b').val(ACC.common.parseNumber(angleb, lang));
                    }

                    if (splitting.length) {
                        $('.js-cfg-production-split .js-cfg-production-btn').click();
                    }

                    if (splitting.length || cutting.length || surface.length) {
                        $('.js-cfg-trigger:not([data-type="remove"])').click();

                        const isProdPanelOpen = $('[data-panel-id="production-panel"]').hasClass('open');
                        if(isProdPanelOpen) {
                            ACC.common.handlePanel('production-panel');
                            ACC.common.panelProgres = false;
                        }
                    }
                }, 700);
            }
        }
    },

    bindOpenSelectDeliveryDateForAllEntries: function () {
        $('.js-cfg-delivery-date-calendar').on('click', function (e) {

            $.colorbox({
                href: '.js-cfg-delivery-date-calendar-box',
                inline: true,
                opacity: 0.7,
                width: '540px',
                maxWidth: '100%',
                maxHeight: '100%',
                close: '',
                title: '',
                onComplete: function () {
                    $('#cboxTitle').hide();
                    $('#cboxLoadedContent').css('margin-top', '20px');

                    const resizeOnLoad = function () {
                        $.colorbox.resize();
                    };
                    ACC.configurator.createDatepicker(".js-cfg-all-dates",resizeOnLoad);

                    $('.js-cfg-delivery-date-calendar-cancel').on('click', function (e) {
                        e.preventDefault();
                        $.colorbox.close();
                    }
                    );
                    $('.js-cfg-delivery-date-calendar-submit').on('click', function (e) {
                        e.preventDefault();
                        $(this).prop('disabled', true);
                        $('.js-cfg-delivery-date-calendar-cancel').prop('disabled', true);
                        $('.js-cfg-all-dates').datepicker('option', 'disabled', true);
                        
                        const datePicker = $('.js-cfg-all-dates');
                        let date = datePicker.datepicker('getDate');
                        date = $.datepicker.formatDate('yy-mm-dd', date);
                        $(this).next('.js-cfg-change-date-loader').removeClass('hidden');
                        if (date) {
                            ACC.cart.changeDeliveryDateForAllEntries(date, datePicker)
                        }
                    });
                }
            });
        });
    },

    getCartData: async function () {
        return $.ajax({
            'type': 'GET',
            'url': ACC.config.encodedContextPath + '/rest/cart',
            'contentType': 'application/json',
            'headers': {
                'CSRFToken': ACC.config.CSRFToken
            },
            success: function (data) {
                return data
            }
        });
    },

    setSideLoader: function (state) {
        if(state) {
            $('.cart-r23-right').addClass('loading');
        } else {
            $('.cart-r23-right').removeClass('loading');
        }
    },

    bindAutoSelectDeliveryDateForAllEntries: function () {
        $('.js-cfg-auto-select-same-date').on('click', async function (e) {
            e.preventDefault();

            $(this).prop('disabled', true);
            ACC.cart.setSideLoader(true);

            const datePicker = null;
            const cartData = await ACC.cart.getCartData()
            const schedules = cartData.entries.flatMap((entry) => entry.schedules); 
            const highestDateSchedule = schedules.reduce((prev, current) => (prev.date > current.date) ? prev : current);
            
            const onSuccess = () => {
                ACC.cart.setSideLoader(false);
                $(this).prop('disabled', false);
                location.reload();
            }

            const formattedDate = new Date(highestDateSchedule.date);
            const formattedLocalizedDate = formattedDate.toISOString().split("T")[0];

            ACC.cart.changeDeliveryDateForAllEntries(formattedLocalizedDate, datePicker, onSuccess)


        });
    },

    collectEntryDataFromCartEntry: function (entry) {
        const data = {
            quantity: entry.modificationQuantity,
            unitCode: entry.modificationUnit.code,
            productCode: entry.product.code,
            desiredDeliveryDate: entry.desiredDeliveryDate,
            ...(entry.orderedQuantity && { quantity: entry.orderedQuantity }),
            ...(entry.cutting && { cutting: entry.cutting }),
            ...(entry.sheetMetalProcessing && { sheetProcessing: entry.sheetMetalProcessing }), // TODO: Might need to be fixed.
            ...(entry.surfaceTreatment && { surfaceTreatment: {
                colour: entry.surfaceTreatment.colour.code,
                colourType: entry.surfaceTreatment.colourType.code,
            } }),
            ...(entry.rowMark && { rowMark: entry.rowMark }),
            ...(entry.packingInfo && { packingInfo: entry.packingInfo }),
            ...(entry.splitting && { splitting: entry.splitting }),
            ...(entry.certificate && { certificationOption: entry.certificate.code }),
        };

        return data
    },

    bindSelectJointDeliveryDateFromEntry: function () {
        $('.js-cfg-select-joint-date').on('click', function (e) {
            e.preventDefault();
            $('.js-cfg-select-joint-date').prop('disabled', true); 

            const latestDate = $(this).parent().find('.js-cfg-scheduled-joint-date').last();

            const entryId = latestDate.data("id");
            const desiredDeliveryDate = latestDate.data("date");
            const formattedDeliveryDate = new Date(desiredDeliveryDate);
            const formattedLocalizedDeliveryDate = formattedDeliveryDate.toISOString().split("T")[0];

            const entryData = ACC.cartData.entries.find((entry) => entry.entryNumber === entryId);

            if (!entryData) {
                return;
            }

            let data = { 
                ...ACC.cart.collectEntryDataFromCartEntry(entryData),
                desiredDeliveryDate: formattedLocalizedDeliveryDate
            };

            data = JSON.stringify(data);

            $.ajax({
                'type': 'PUT',
                'url': ACC.config.encodedContextPath + '/rest/cart/entry/' + entryId,
                'data': data,
                'contentType': 'application/json',
                'headers': {
                    'CSRFToken': ACC.config.CSRFToken
                },
                success: function () {
                    $('.js-cfg-select-joint-date').prop('disabled', false);
                    location.reload();
                },
            });
        });
    },

    changeDeliveryDateForAllEntries: function (
        date, 
        datePicker, 
        onSuccess = () => location.reload()
    ) {
        let data = {};
        data.desiredDeliveryDate = date;
        data = JSON.stringify(data);

        if (datePicker) {
            datePicker.removeClass('valid invalid');
        }

        $.ajax({
            'type': 'PUT',
            'url': ACC.config.encodedContextPath + '/rest/cart/deliveryDate',
            'data': data,
            'contentType': 'application/json',
            'headers': {
                'CSRFToken': ACC.config.CSRFToken
            },
            success: function () {
                onSuccess();
            },
            error: function () {
                if (datePicker) {
                    datePicker?.addClass('invalid');
                }
            }
        });
    },

    bindDeliveryDate: function () {
        const datePicker = $('.js-cart-delivery-date');

        if (datePicker.length > 0) {
            ACC.configurator.findDeliveryDates(datePicker);
        }

        datePicker.on('change', function () {
            let date = datePicker.datepicker('getDate');
            date = $.datepicker.formatDate('yy-mm-dd', date);
            $(this).next('.js-cfg-change-date-loader').removeClass('hidden');

            if (date) {
                ACC.cart.changeDeliveryDateForAllEntries(date, datePicker)
            }
        });
    },

    resetQuickOrderForm: () => {
        $('.js-cart-search').removeClass('has-error');
        if($('.js-quick-order-product').is(':empty')) {
            $('.js-cart-search-info').removeClass('hidden');
            $('.loader').addClass('hidden');
        }
        $('.js-cart-search-error').addClass('hidden');
    },

    bindQuickOrder: function () { // old CartSearch
        let productData = {};
        const jsCartProduct = $('.js-cart-product');
        const jsQuickOrderProduct = $('.js-quick-order-product');
        const jsProductBox = $('.js-quick-order-product, .js-cart-product');
        const quickOrderInput = $('.js-cart-search-input');
        const openQuickOrder = $('[data-panel-nav="quick-order-panel"]');
        
        $('.js-cart-search-remove').on('click', function (e) {
            e.preventDefault();
            quickOrderInput.val('').focus();
            jsQuickOrderProduct.empty();
            ACC.cart.resetQuickOrderForm();
        });

        quickOrderInput.keypress(function (e) {
            const input = $(this);
            
            ACC.cart.resetQuickOrderForm();

            if (e.keyCode === 13) {
                const code = input.val().trim();

                runCartSearch(code);

                $(this).next().focus();
                return false;
            }
        });

        $('.js-cart-search-button').on('click', function (e) {
            e.preventDefault();

            const code = quickOrderInput.val().trim();
            runCartSearch(code);
        });

        let $jsProductList = $('.js-product__list');
        $jsProductList.on('click', '.js-cart-add-from-list', function (e) {
            e.preventDefault();

            const code = $(this).data('code');
            runCartSearch(code, true);
        });
        $jsProductList.on('click', '.js-create-product-ticket-from-list',function (e) {
            e.preventDefault();
            const id = $(this).data('id');
            const type = $(this).data('type');
            ACC.mypages.createTicket(id, type);
        });

        $(document).on('keypress',function(e) {
            if(e.which === 13) {
                if ($('.js-tab-index').is( ':focus')) {
                    $('.js-cfg-add-to-cart').trigger('click');
                }
            }
        });

        openQuickOrder.on('click', () => {
            quickOrderInput.focus();
            ACC.configurator.activeCfg = jsQuickOrderProduct;
            if(quickOrderInput.val()) {
                $('.js-cart-search-button').trigger('click')
            }
        })

        jsProductBox.on('click', '.js-cart-original', function () {
            $('.js-cart-remnants-list').addClass('hidden').find('.selected').removeClass('selected');
            $('.js-customer-price').removeClass('hidden');

            ACC.configurator.selectedProduct.remnant = false;
            updateUI(productData);
        });

        jsProductBox.on('click', '.js-cart-remnants',function () {
            $('.js-cart-remnants-list').removeClass('hidden');
            $('.js-customer-price').addClass('hidden');
            $('.js-cfg-prod-details').empty();
        });

        jsProductBox.on('click', '.js-cart-remnant',function () {
            const button = $(this);
            const code = button.data('id');
            const quantity = parseInt(button.data('quantity'));

            button
              .addClass("selected")
              .closest("tr")
              .addClass("selected")
              .siblings()
              .removeClass("selected")
              .find(".js-cart-remnant")
              .removeClass("selected");
            $('.js-customer-price').removeClass('hidden');

            selectRemnant(code, quantity);
        });

        function runCartSearch(code, isFromList) {
            mainEl = isFromList ? jsCartProduct : jsQuickOrderProduct;
            ACC.configurator.activeCfg = mainEl;

            $('.js-cart-edit-entry-box').empty();
            $('.js-cart-search-info, .js-cart-search-error').addClass('hidden');
            $('.js-cart-search').removeClass('has-error');
            $('.loader').removeClass('hidden');

            mainEl.empty();

            const dataString = JSON.stringify({ code });

            $.ajax({
                'type': 'POST',
                'url': ACC.config.encodedContextPath + '/rest/products/search',
                'data': dataString,
                'contentType': 'application/json',
                'headers': {
                    'CSRFToken': ACC.config.CSRFToken
                },
                success: function (data) {
                    productData = data;

                    for (let i = 0; i < data.productAdditionalData.length; i++) {
                        if (data.productAdditionalData[i].code === 'description') {
                            data.description = data.productAdditionalData[i].value;
                        }
                    }

                    if(data.remnants) {
                        for (i = 0; i < data.remnants.length; i++) {
                            if(data.remnants[i].width === 0) {
                                data.remnants[i].width = '-';
                            }

                            if(data.remnants[i].length === 0) {
                                data.remnants[i].length = '-';
                            }
                        }
                    }

                    const productTpl = $('#cartProduct').html();
                    const template = Handlebars.compile(productTpl);
                    const productObj = template({data: data, isFromList});

                    mainEl.append(productObj).removeClass('hidden');
                    $('.js-product-configurator').empty();

                    ACC.configurator.resetProductionOptionsView();
                    ACC.cart.showProductVariantInfo(data);

                    $('.loader').addClass('hidden');
                    if(isFromList) {
                        $('.js-cart-panel-info').append($('.js-list-cart'));
                    } else {
                        ACC.cart.bindCartBoxes();
                    }

                    updateUI(productData, false, !isFromList);
                },
                error: function (data) {
                    ACC.navigation.handleSessionError(data, 403);
                    
                    const text = data.responseJSON?.errors?.[0]?.message || data.responseJSON
                    $('.js-cart-search-error').text(text).removeClass('hidden');
                    $('.js-cart-search').addClass('has-error');
                }
            });
        }

        function selectRemnant(code, quantity) {
            $.ajax({
                'type': 'GET',
                'url': ACC.config.encodedContextPath + '/rest/remnants/' + code,
                success: function (data) {
                    if (data) {
                        ACC.configurator.selectedProduct.remnant = true;
                        ACC.configurator.selectedProduct.remnantData = {};
                        ACC.configurator.selectedProduct.remnantData.batchNumber = code;
                        updateUI(data.product, quantity);
                        $('.js-cfg-prod-details').show();
                    }
                }
            });
        }

        function updateUI(data, quantity, quickOrder) {
            quickOrderClass = quickOrder ? ".js-quick-order-product " : '';
            $(quickOrderClass + '.js-cfg-prod-details').html($('#cartProductDetails').html());

            ACC.configurator.generateProductionOptions();
            ACC.configurator.selectedProduct = {
                ...ACC.configurator.selectedProduct,
                productData: data
            }
            ACC.configurator.updateProductDetails(quantity);
            ACC.configurator.bindProductionUI();
            ACC.configurator.bindAddToCart();
            ACC.configurator.createDatepicker();
            ACC.cart.bindCartBoxes();
            ACC.mypages.bindTicketForm();
        }
    },

    bindOrderSubmit: function () {
        $('.js-cart-submit-order').on('click', function (e) {
            e.preventDefault();

            const productCertification = ACC.cartData?.entries.reduce((acc, entry) =>{
                const certAvailable = entry.product.certificationOptions?.find(el => el.code === '3M')
                if (!certAvailable) {
                    return acc;
                }

                const {withCert, withoutCert} = acc;
                const obj = entry.certification ? withCert : withoutCert;
                obj.push(entry);

                return { withCert, withoutCert };
            }, {
                withCert: [],
                withoutCert: []
            });

            $('.js-cart-submit-order-error').addClass('hidden');

            $.colorbox({
                href: '.js-cart-submit-order-box',
                inline: true,
                opacity: 0.7,
                width: '664px',
                height: 'auto',
                maxWidth: '100%',
                maxHeight: '100%',
                close: '',
                title: '',
                onComplete: function () {
                    $('#cboxTitle').hide();
                    $('#cboxLoadedContent').css('margin-top', '20px');

                    $('.js-cart-submit-order-box').empty();

                    const ordersTpl = $('#submitOrdersCertification').html();
                    const template = Handlebars.compile(ordersTpl);
                    const pc = template({ productCertification });
                    $('.js-cart-submit-order-box').append(pc);
                    $.colorbox.resize();

                    $('.js-add-certificate-to-entry').on('click', function (e) {
                        e.preventDefault();
                        const selectedValues = $(".js-cart-selected-entries").val() ? $(".js-cart-selected-entries").val().split(',') : [];

                        const data = selectedValues.map((entryNumber)=>({
                            entryNumber: Number(entryNumber),
                            certificateType: "3M"
                        }));

                        if (!data.length) {
                            return;
                        }

                        $.ajax({
                            'type': 'PUT',
                            'url': ACC.config.encodedContextPath + '/rest/cart/certificates',
                            'contentType': 'application/json',
                            'data': JSON.stringify({
                                entries: data
                            }),
                            'headers': {
                                'CSRFToken': ACC.config.CSRFToken
                            },
                            success: function (data) {
                                window.location.reload();
                            },
                            error: function (data) {
                                ACC.navigation.handleSessionError(data, 403);
            
                                const errorMessage = data.status === 403 ? ACC.messages.sessionTimeOut : data.responseJSON[0].errorMessage;
                                $('.js-cart-submit-order-error').html(errorMessage).removeClass('hidden');
                                $.colorbox.resize();
                                parentBox.removeClass('cloader');
                            }
                        });
                    });

                    $('.js-cart-select-entry').on('click', function (e) {
                        e.preventDefault();
                        
                        const entryId = $(this).data('entry-id').toString();
                        const selectedValues = $(".js-cart-selected-entries").val() ? $(".js-cart-selected-entries").val().split(',') : [];
                        
                        if (selectedValues.includes(entryId)) {
                            $(".js-cart-selected-entries").val(selectedValues.filter(el => el !== entryId).join(','));
                            $(this).attr('data-selected', false);
                        } else {
                            selectedValues.push(entryId)
                            $(".js-cart-selected-entries").val(selectedValues.join(','));
                            $(this).attr('data-selected', true);
                        }
                    });

                    $('.js-cart-submit-order-cancel').on('click', function (e) {
                        e.preventDefault();
                        $.colorbox.close();
                    });

                    $('.js-cart-submit-order-submit').on('click', function (e) {
                        e.preventDefault();
                        const url = $('.js-cart-submit-order').data('url');

                        const $this = $(this);
                        const parentBox = $this.closest('.js-cart-submit-order-box');
                        ACC.forms.startLoader(parentBox, $this);

                        const cartId = $this.data("cart-id");
                        $.ajax({
                            'type': 'POST',
                            'url': ACC.config.encodedContextPath + '/rest/order/' + cartId,
                            'contentType': 'application/json',
                            'headers': {
                                'CSRFToken': ACC.config.CSRFToken
                            },
                            success: function (data) {
                                if (data && data.code) {
                                    ACC.giosg.placeOrder();
                                    ACC.track.trackPurchaseGA4(data);
                                    window.location = url + '/' + data.code;
                                }
                            },
                            error: function (data) {
                                ACC.navigation.handleSessionError(data, 403);
            
                                const errorMessage = data.status === 403 ? ACC.messages.sessionTimeOut : data.responseJSON[0].errorMessage;
                                $('.js-cart-submit-order-error').html(errorMessage).removeClass('hidden');
                                $.colorbox.resize();
                                ACC.forms.stopLoader(parentBox, $this);
                            }
                        });
                    });
                }
            });
        });
    },

    bindCartClear: function () {
        $('.js-clear-cart-link').on('click', function (e) {
            e.preventDefault();

            $('.js-cart-clear-error').addClass('hidden');

            $.colorbox({
                href: '.js-cart-clear-box',
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
        });

        $('.js-cart-clear-submit').on('click', function (e) {
            e.preventDefault();

            const $this = $(this);
            const parentBox = $this.closest('.js-cart-clear-box');
            ACC.forms.startLoader(parentBox, $this);

            $.ajax({
                'type': 'DELETE',
                'url': ACC.config.encodedContextPath + '/rest/cart/clear',
                'contentType': 'application/json',
                'headers': {
                    'CSRFToken': ACC.config.CSRFToken,
                    'Accept':'application/json',
                },
                success: function () {
                    window.location.reload();
                },
                error: function (data) {
                    const errorMessage = data.status === 403 ? ACC.messages.sessionTimeOut : data.responseJSON[0].errorMessage;
                    $('.js-cart-clear-error').html(errorMessage).removeClass('hidden');
                    $.colorbox.resize();
                    ACC.forms.stopLoader(parentBox, $this);
                }
            });
        });

        $('.js-cart-clear-cancel').on('click', function (e) {
            e.preventDefault();
            $.colorbox.close();
        });
    },

    bindPunchoutSubmit: function () {
        $('.js-cart-cxml-punchout-cancel').on('click', function () {
            const url = $('.js-cart-cxml-punchout-cancel').data('url');
            $(location).attr('href',url);
        });
        $('.js-cart-cxml-punchout-requisition').on('click', function () {
            const { entries, value, currency } = ACC.cartData;
            const totalPrice = { value, currencyIso: currency }
            ACC.track.trackPurchaseGA4({ entries, totalPrice });

            const url = $('.js-cart-cxml-punchout-requisition').data('url');
            $(location).attr('href',url);
        });
    },

    bindQuoteSubmit: function () {
        $('.js-cart-submit-quote').on('click', function (e) {
            e.preventDefault();

            $('.js-cart-submit-quote-error').addClass('hidden');

            $.colorbox({
                href: '.js-cart-submit-quote-box',
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
        });

        $('.js-cart-submit-quote-submit').on('click', function (e) {
            e.preventDefault();
            const url = $('.js-cart-submit-quote').data('url');

            const $this = $(this);
            const parentBox = $this.closest('.js-cart-submit-quote-box');
            ACC.forms.startLoader(parentBox, $this);

            const cartId = $this.data("cart-id");
            $.ajax({
                'type': 'POST',
                'url': ACC.config.encodedContextPath + '/rest/quote/' + cartId,
                'contentType': 'application/json',
                'headers': {
                    'CSRFToken': ACC.config.CSRFToken
                },
                success: function (data) {
                    ACC.track.trackQuoteRequestGA4(data?.code);

                    if (data && data.code) {
                        window.location = url + '/' + data.code;
                    } else {
                        location.reload();
                    }
                },
                error: function (data) {
                    ACC.navigation.handleSessionError(data, 403);

                    $('.js-cart-submit-quote-error').html(data.responseJSON).removeClass('hidden');
                    $.colorbox.resize();
                    ACC.forms.stopLoader(parentBox, $this);
                }
            });
        });

        $('.js-cart-submit-quote-cancel').on('click', function (e) {
            e.preventDefault();
            $.colorbox.close();
        });
    },

    showProductVariantInfo: function (data) {
        const options = data.classifications.map(item => {
          const { featureUnit, featureValues, name } = item.features[0];
          return {
            name,
            icon: item.attributes[0]?.icon || "",
            featureUnit: featureUnit?.symbol || "",
            value: featureValues[0].value,
          };
        });
        ACC.configurator.handleSelectedProductInfo(options);
    },

    cartRestoration: function () {
        $('.cartRestoration').click(function () {
            window.location = $(this).data("cartUrl");
        });
    },

    bindCartPage: function () {
        // link to display the multi-d grid in read-only mode
        $(document).on("click", '.js-show-editable-grid', function (event) {
            ACC.cart.populateAndShowEditableGrid(this, event);
        });
    },


    populateAndShowEditableGrid: function (element) {
        const readOnly = $(element).data("readOnlyMultidGrid");
        const itemIndex = $(element).data("index");
        const grid = $(document).find("#ajaxGrid" + itemIndex);

        const gridEntries = $(document).find('#grid' + itemIndex);
        const strSubEntries = gridEntries.data("sub-entries");
        const arrSubEntries = strSubEntries.split(',');
        const firstVariantCode = arrSubEntries[0].split(':')[0];

        $(element).toggleClass('open');

        const targetUrl = gridEntries.data("target-url");

        let mapCodeQuantity = {};
        for (let i = 0; i < arrSubEntries.length; i++) {
            const arrValue = arrSubEntries[i].split(":");
            mapCodeQuantity[arrValue[0]] = arrValue[1];
        }

        if (grid.children('#cartOrderGridForm').length > 0) {
            grid.slideToggle("slow");
        }
        else {
            const method = "GET";
            $.ajax({
                url: targetUrl,
                data: {productCode: firstVariantCode, readOnly},
                type: method,
                dataType: 'html',
                success: function (data) {
                    grid.html(data);
                    $("#ajaxGrid").removeAttr('id');
                    const $gridContainer = grid.find(".product-grid-container");
                    const numGrids = $gridContainer.length;
                    for (let i = 0; i < numGrids; i++) {
                        ACC.cart.getProductQuantity($gridContainer.eq(i), mapCodeQuantity, i);
                    }
                    grid.slideDown("slow");
                    ACC.cart.coreCartGridTableActions(element, mapCodeQuantity);
                    ACC.productorderform.coreTableScrollActions(grid.children('#cartOrderGridForm'));
                },
                error: function (xht, textStatus, ex) {
                    console.log("Failed to get variant matrix. Error details [" + xht + ", " + textStatus + ", " + ex + "]");
                }

            });
        }
    },


    coreCartGridTableActions: function (element, mapCodeQuantity) {
        ACC.productorderform.bindUpdateFutureStockButton(".update_future_stock_button");
        ACC.productorderform.bindVariantSelect($(".variant-select-btn"), 'cartOrderGridForm');
        const itemIndex = $(element).data("index");
        const skuQuantityClass = '.sku-quantity';

        let quantityBefore = 0;
        const grid = $(document).find('#ajaxGrid' + itemIndex + " .product-grid-container");

        grid.on('focusin', skuQuantityClass, function () {
            quantityBefore = jQuery.trim(this.value);

            $(this).parents('tr').next('.variant-summary').remove();
            if ($(this).parents('table').data(ACC.productorderform.selectedVariantData)) {
                ACC.productorderform.selectedVariants = $(this).parents('table').data(ACC.productorderform.selectedVariantData);
            } else {
                ACC.productorderform.selectedVariants = [];
            }

            if (!quantityBefore) {
                quantityBefore = 0;
                this.value = 0;
            }
        });

        grid.on('focusout keypress', skuQuantityClass, function (event) {
            const code = event.keyCode || event.which || event.charCode;

            if (code !== 13 && code !== undefined) {
                return;
            }

            let quantityAfter = 0;
            let gridLevelTotalPrice = "";

            const indexPattern = "[0-9]+";
            const currentIndex = parseInt($(this).attr("id").match(indexPattern));

            this.value = ACC.productorderform.filterSkuEntry(this.value);

            quantityAfter = jQuery.trim(this.value);
            const variantCode = $(document).find("input[id='cartEntries[" + currentIndex + "].sku']").val();

            if (isNaN(jQuery.trim(this.value))) {
                this.value = 0;
            }

            if (!quantityAfter) {
                quantityAfter = 0;
                this.value = 0;
            }

            const $gridTotalValue = grid.find("[data-grid-total-id=" + 'total_value_' + currentIndex + "]");
            const currentPrice = $(document).find("input[id='productPrice[" + currentIndex + "]']").val();

            if (quantityAfter > 0) {
                gridLevelTotalPrice = ACC.productorderform.formatTotalsCurrency(parseFloat(currentPrice) * parseInt(quantityAfter));
            }

            $gridTotalValue.text(gridLevelTotalPrice);

            const _this = this;
            const priceSibling = $(this).siblings('.price');
            const propSibling = $(this).siblings('.variant-prop');
            const currentSkuId = $(this).next('.td_stock').data('sku-id');
            const currentBaseTotal = $(this).siblings('.data-grid-total');

            if (this.value !== quantityBefore) {
                let newVariant = true;
                ACC.productorderform.selectedVariants.forEach(function (item, index) {
                    if (item.id === currentSkuId) {
                        newVariant = false;

                        if (_this.value === '0' || _this.value === 0) {
                            ACC.productorderform.selectedVariants.splice(index, 1);
                        } else {
                            ACC.productorderform.selectedVariants[index].quantity = _this.value;
                            ACC.productorderform.selectedVariants[index].total = ACC.productorderform.updateVariantTotal(priceSibling, _this.value, currentBaseTotal);
                        }
                    }
                });

                if (newVariant && this.value > 0) {
                    // update variantData
                    ACC.productorderform.selectedVariants.push({
                        id: currentSkuId,
                        size: propSibling.data('variant-prop'),
                        quantity: _this.value,
                        total: ACC.productorderform.updateVariantTotal(priceSibling, _this.value, currentBaseTotal)
                    });
                }
            }
            ACC.productorderform.showSelectedVariant($(this).parents('table'));
            if (this.value > 0 && this.value !== quantityBefore) {
                $(this).parents('table').addClass('selected');
            } else {
                if (ACC.productorderform.selectedVariants.length === 0) {
                    $(this).parents('table').removeClass('selected').find('.variant-summary').remove();

                }
            }

            if (quantityBefore !== quantityAfter) {
                const method = "POST";
                $.ajax({
                    url: ACC.config.encodedContextPath + '/cart/updateMultiD',
                    data: {productCode: variantCode, quantity: quantityAfter, entryNumber: -1},
                    type: method,
                    success: function (data) {
                        ACC.cart.refreshCartData(data, -1, quantityAfter, itemIndex);
                        mapCodeQuantity[variantCode] = quantityAfter;
                    },
                    error: function (xhr) {
                        const redirectUrl = xhr.getResponseHeader("redirectUrl");
                        const connection = xhr.getResponseHeader("Connection");
                        // check if error leads to a redirect
                        if (redirectUrl !== null) {
                            window.location = redirectUrl;
                            // check if error is caused by a closed connection
                        } else if (connection === "close") {
                            window.location.reload();
                        }
                    }
                });
            }
        });
    },

    refreshCartData: function (cartData, entryNum, quantity, itemIndex) {
        // if cart is empty, we need to reload the whole page
        if (cartData.entries.length === 0) {
            location.reload();
        }
        else {
            let form;

            if (entryNum === -1) // grouped item
            {
                form = $(document).find('.js-qty-form' + itemIndex);
                const productCode = form.find('input[name=productCode]').val();

                quantity = 0;
                let entryPrice = 0;
                for (let i = 0; i < cartData.entries.length; i++) {
                    const entry = cartData.entries[i];
                    if (entry.product.code === productCode) {
                        quantity = entry.quantity;
                        entryPrice = entry.totalPrice;
                        ACC.cart.updateEntryNumbersForCartMenuData(entry);
                        break;
                    }
                }

                if (quantity === 0) {
                    location.reload();
                }
                else {
                    form.find(".qtyValue").text(quantity);
                    form.parent().parent().find(".js-item-total").text(entryPrice.formattedValue);
                }
            }

            ACC.cart.refreshCartPageWithJSONResponse(cartData);
        }
    },

    refreshCartPageWithJSONResponse: function (cartData) {
        // refresh mini cart
        ACC.minicart.updateMiniCartDisplay();
        $('.js-cart-top-totals').text($("#cartTopTotalSectionTemplate").tmpl(cartData));
        $('div .cartpotproline').remove();
        $('div .cartproline').remove();
        $('.js-cart-totals').remove();
        $('#ajaxCartPotentialPromotionSection').text($("#cartPotentialPromotionSectionTemplate").tmpl(cartData));
        $('#ajaxCartPromotionSection').text($("#cartPromotionSectionTemplate").tmpl(cartData));
        $('#ajaxCart').text($("#cartTotalsTemplate").tmpl(cartData));
        ACC.quote.bindQuoteDiscount();
    },

    updateEntryNumbersForCartMenuData: function (entry) {
        let entryNumbers = "";
        $.each(entry.entries, function (index, subEntry) {
            if (index !== 0) {
                entryNumbers = entryNumbers + ";";
            }
            entryNumbers = entryNumbers + subEntry.entryNumber;
        });
        $('.js-execute-entry-action-button').data('actionEntryNumbers', entryNumbers);
    },

    getProductQuantity: function (gridContainer, mapData) {
        const tables = gridContainer.find("table");

        $.each(tables, function (index, currentTable) {
            const skus = jQuery.map($(currentTable).find("input[type='hidden'].sku"), function (o) {
                return o.value
            });
            const quantities = jQuery.map($(currentTable).find("input[type='textbox'].sku-quantity"), function (o) {
                return o
            });
            let selectedVariants = [];

            $.each(skus, function (index, skuId) {
                const quantity = mapData[skuId];
                if (quantity) {
                    quantities[index].value = quantity;

                    const indexPattern = "[0-9]+";
                    const currentIndex = parseInt(quantities[index].id.match(indexPattern));
                    const gridTotalValue = gridContainer.find("[data-grid-total-id=" + 'total_value_' + currentIndex + "]");
                    let gridLevelTotalPrice = "";
                    const currentPrice = $(document).find("input[id='productPrice[" + currentIndex + "]']").val();
                    if (quantity > 0) {
                        gridLevelTotalPrice = ACC.productorderform.formatTotalsCurrency(parseFloat(currentPrice) * parseInt(quantity));
                    }
                    gridTotalValue.text(gridLevelTotalPrice);

                    selectedVariants.push({
                        id: skuId,
                        size: $(quantities[index]).siblings('.variant-prop').data('variant-prop'),
                        quantity: quantity,
                        total: gridLevelTotalPrice
                    });
                }
            });

            if (selectedVariants.length !== 0) {
                $.tmpl(ACC.productorderform.$variantSummaryTemplate, {
                    variants: selectedVariants
                }).appendTo($(currentTable).addClass('selected'));
                $(currentTable).find('.variant-summary .variant-property').text($(currentTable).find('.variant-detail').data('variant-property'));
                $(currentTable).data(ACC.productorderform.selectedVariantData, selectedVariants);
            }
        });

    },

    bindMultidCartProduct: function () {
        // link to display the multi-d grid in read-only mode
        $(document).on("click", '.showQuantityProduct', function (event) {
            ACC.multidgrid.populateAndShowGrid(this, event, true);
        });

        // link to display the multi-d grid in read-only mode
        $(document).on("click", '.showQuantityProductOverlay', function (event) {
            ACC.multidgrid.populateAndShowGridOverlay(this, event);
        });

    }
};
