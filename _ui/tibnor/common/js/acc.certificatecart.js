/*
 * Tibnor AB B2B Commerce Solution
 *
 * Copyright (c) 2018-2019. All rights reserved.
 *
 * This software is the confidential and proprietary information of Tibnor AB.
 */

ACC.certificateCart = {

    _autoload: [
        "bindCertCartAddress",
        "bindCertCartEntryRemove",
        "bindCertOrderSubmit",
        "bindCertCartOrderInfo",
        "bindCertCartOrderInfoActions",
        "bindDownloadCertificates"
    ],

    bindCertCartOrderInfo: function () {
        $('.js-certcart-add-order-info').on('click', function (e) {
            e.preventDefault();

            $.colorbox({
                href: '.js-certcart-info',
                inline: true,
                opacity: 0.7,
                width: '600px',
                maxWidth: '100%',
                maxHeight: '100%',
                close: '',
                title: $('.js-certcart-orderinfo-header').html(),
            });
        });
    },

    bindCertCartOrderInfoActions: function () {
        function toggleDisableButtons(state) {
            $('.js-certcart-info-save').prop('disabled', state);
            $('.js-certcart-info-cancel').prop('disabled', state);
        }

        $('.js-certcart-info-cancel').on('click', function (e) {
            e.preventDefault();
            $.colorbox.close();
        });

        $('.js-certcart-info-save').on('click', function (e) {
            e.preventDefault();
            const fields = $(this).parents('.js-certcart-info').find('.js-certcart-info-field');

            const saveFieldData = (field, cartId, cartAttrib, data) => {
                return new Promise ((resolve, reject) => {
                    field.prop('disabled', true);

                    $.ajax({
                        'type': 'PUT',
                        'url': ACC.config.encodedContextPath + '/rest/certificates/cart/' + cartId + "/" + cartAttrib,
                        'data': data,
                        'contentType': 'application/json',
                        'headers': {
                            'CSRFToken': ACC.config.CSRFToken
                        },
                        success: function () {
                            field.addClass('valid');
        
                            setTimeout(function () {
                                $('.js-certcart-info-field').removeClass('valid');
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
                const cartId = field.data('cart-id');
                const cartAttrib = field.data('cart-attrib');
                let data = {};
                data.customerInput = field.val();
                data = JSON.stringify(data);
                promisesData.push({field, cartId, cartAttrib, data});
            });

            toggleDisableButtons(true);

            Promise.all(promisesData.map(({ field, cartId, cartAttrib, data }) => saveFieldData(field, cartId, cartAttrib, data)))
            .then(() => {
                $.colorbox.close();
            });
            
        });
    },

    bindCertCartAddress: function () {
        const jsAddressCountry = $('.js-certcart-edit-address-country');
        jsAddressCountry.val(jsAddressCountry.data('current'))

        $('.js-certcart-change-address-btn').on('click', function () {
            const cartId = $(this).data('cart-id');

            ACC.common.addressPopup(function (code) {
                let data = {
                    'sapCode': code
                };

                data = JSON.stringify(data);

                $.ajax({
                    'type': 'POST',
                    'url': ACC.config.encodedContextPath + '/rest/certificates/cart/' + cartId + '/address',
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

        $('.js-certcart-edit-address-btn').on('click', function () {
            const countryCode = jsAddressCountry.val() || jsAddressCountry.data('current');
            if(countryCode) {
                  ACC.certificateCart.updateTransportZones(countryCode)
            }
        });

        $('.js-certcart-edit-address-country').on('change', function () {
            const countryCode = jsAddressCountry.val();
            if(countryCode) {
                  ACC.certificateCart.updateTransportZones(countryCode)
            }
        });

        $('.js-certcart-edit-address-save').on('click', function (e) {
            e.preventDefault();

            const formFields = $('.js-certcart-edit-address-form').serializeArray();

            let formData = {};
            $(formFields).each(function (index, obj) {
                formData[obj.name] = obj.value;
            });

            formData.city = $('.js-certcart-edit-address-zones').find('option:selected').text();

            let dataJ = JSON.stringify(formData);

            const cartId = $(this).data('cart-id');
            $.ajax({
                'type': 'POST',
                'url': ACC.config.encodedContextPath + '/rest/certificates/cart/' + cartId + '/address/edit',
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

                    $('.js-certcart-edit-address-error').html(errorMessage).removeClass('hidden');
                }
            });
        });

        $('.js-certcart-edit-address-cancel').on('click', function (e) {
            e.preventDefault();
            $.colorbox.close();
        });
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
                        const jsAddressZones = $('.js-certcart-edit-address-zones');
                        const currentZone = jsAddressZones.data('current');
                        let zonesData = '';

                        for (let i = 0; i < data.length; i++) {
                            zonesData += '<option value="' + data[i].transportZone + '">' + data[i].description + '</option>';
                        }

                        jsAddressZones.empty();
                        $(zonesData).appendTo(jsAddressZones);
                        jsAddressZones.val(currentZone);

                        $('.js-certcart-edit-address-error').text('').addClass('hidden');

                        $.colorbox({
                            href: '.js-certcart-edit-address',
                            inline: true,
                            opacity: 0.7,
                            width: '700px',
                            maxWidth: '100%',
                            maxHeight: '100%',
                            close: '',
                            title: $('.js-certcart-edit-address-header').html()
                        });
                    }
                });
    },

    bindCertCartEntryRemove: function () {
        $('.js-certificatecart-remove-entry').on('click', function (e) {
            e.preventDefault();

            const $this = $(this);
            const cartId = $this.data('cart-id');
            const entry = $this.data('entry');

            $.colorbox({
                href: '.js-certificatecart-remove-entry-box',
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

            $('.js-certificatecart-remove-entry-remove').on('click', function (e) {
                e.preventDefault();

                const btn = $(this);
                btn.addClass('disabled');

                $.ajax({
                    'type': 'DELETE',
                    'url': ACC.config.encodedContextPath + '/rest/certificates/cart/' + cartId + '/entry/' + entry,
                    'contentType': 'application/json',
                    'headers': {
                        'CSRFToken': ACC.config.CSRFToken
                    },
                    success: function (data) {
                        location.reload();
                    },
                    error: function () {
                        btn.removeClass('disabled');
                    }
                });
            });
        });

        $('.js-certificatecart-remove-entry-cancel').on('click', function (e) {
            e.preventDefault();
            $.colorbox.close();
        });
    },

    bindCertOrderSubmit: function () {
        $('.js-certcart-submit-order').on('click', function (e) {
            e.preventDefault();
            let $this = $(this);
            const url = $this.data('url');
            const cartId = $this.data('cart-id');
            const $cartSummary = $('.js-certcart-summary');
            ACC.forms.startLoader($cartSummary, $this);

            $.ajax({
                'type': 'POST',
                'url': ACC.config.encodedContextPath + '/rest/certificates/cart/' + cartId + '/order',
                'contentType': 'application/json',
                'headers': {
                    'CSRFToken': ACC.config.CSRFToken
                },
                success: function (data) {
                    if (data && data.code) {
                        window.location = url + '/' + data.code;
                    }
                },
                error: function (data) {
                    ACC.navigation.handleSessionError(data, 403);

                    const errorMessage = data.status === 403 ? ACC.messages.sessionTimeOut : data.responseJSON;
                    $('.js-certcart-submit-order-error').html(errorMessage).removeClass('hidden');
                    $.colorbox.resize();
                    ACC.forms.stopLoader($cartSummary, $this);
                }
            });
        });
    },

    bindDownloadCertificates: function() {
        $('.js-certorderconfirmation-download-certificates').on('click', function (e) {
            e.stopPropagation();

            const btn = $(this);
            const orderId = btn.data('id');
            const purchaseId = btn.data('purchase');
            ACC.mypages.downloadFile(orderId, 'orderCertificates', btn, purchaseId);
        });

        $('.js-certorderconfirmation-download-certificate').on('click', function(e) {
            e.stopPropagation();

            const btn = $(this);
            const orderId = btn.data('id');
            const certificateId = btn.data('certificate');
            const entryId = btn.data('entry')
            ACC.mypages.downloadFile(orderId, 'certificate', btn, entryId, certificateId);
        });
    }
};
