/*
 * Tibnor AB B2B Commerce Solution
 *
 * Copyright (c) 2018-2019. All rights reserved.
 *
 * This software is the confidential and proprietary information of Tibnor AB.
 */

ACC.mypages = {
    _autoload: [
        "bindOrderSearch",
        "bindActivitiesSearch",
        "bindUI",
        "setQueryParams",
        "triggerInitialSearch",
        "bindTicketForm"
    ],

    urlParams: {},

    getDate: function (datePicker) {
        var date = datePicker.datepicker('getDate');
        date = $.datepicker.formatDate('yy-mm-dd', date);

        return date;
    },

    setDates: function (dateFrom, dateTo) {
        var lang = dateFrom.data('lang');
        ACC.common.setCalendarLocale(lang);

        var date = new Date();
        date.setMonth(date.getMonth() - 1);

        dateFrom.datepicker({
            maxDate: new Date(),
            onSelect: function (dateStr) {
                dateTo.datepicker('option', {
                    minDate: new Date(dateStr)
                });

                if (dateTo.datepicker('getDate') < dateFrom.datepicker('getDate')) {
                    dateTo.datepicker('setDate', dateStr);
                }
            }
        }).datepicker('setDate', date).datepicker($.datepicker.regional[lang]);

        dateTo.datepicker({
            minDate: date,
            maxDate: new Date(),
            onSelect: function (dateStr) {
                dateFrom.datepicker('option', {
                    maxDate: new Date(dateStr)
                });

                if (dateFrom.datepicker('getDate') > dateTo.datepicker('getDate')) {
                    dateFrom.datepicker('setDate', dateStr);
                }
            }
        }).datepicker('setDate', new Date()).datepicker($.datepicker.regional[lang]);
    },

    bindOrderSearch: function () {
        var dateFrom = $('.js-search-orders-from');
        var dateTo = $('.js-search-orders-to');

        ACC.mypages.setDates(dateFrom, dateTo);

        $('.js-search-type').on('click', function () {
            var type = $(this).val();

            $('.js-search-type-params').addClass('hidden').eq(type).removeClass('hidden');
        });

        $('.js-search-orders-advanced').on('submit', function (e) {
            e.preventDefault();
            var formFields = $(this).serializeArray();

            var formData = {};
            $(formFields).each(function (index, obj) {
                formData[obj.name] = obj.value;
            });

            formData.fromDate = ACC.mypages.getDate(dateFrom);
            formData.toDate = ACC.mypages.getDate(dateTo);
            // if this data-order-type is set then add it to the formData
            if ($(this).data('order-type')) {
                formData.orderTypes = $(this).data('order-type').split(',');
            }

            var data = JSON.stringify(formData);

            ACC.mypages.getOrdersData('/rest/order/list/general', data);
        });

        $('.js-search-orders-simple').on('submit', function (e) {
            e.preventDefault();

            var chargeNumber = $('.js-search-orders-charge-number').val();

            var data = '{"chargeNumber":"' + chargeNumber + '"}';
            ACC.mypages.getOrdersData('/rest/order/list/charge_number', data);
        });

        $('.js-search-address-trigger').on('click', function () {
            ACC.common.addressPopup(function (code) {
                $('.js-search-address').val(code);
                $.colorbox.close();
            });
        });
    },

    bindActivitiesSearch: function () {
        var dateFrom = $('.js-search-activities-from');
        var dateTo = $('.js-search-activities-to');

        ACC.mypages.setDates(dateFrom, dateTo);

        $('.js-search-activities').on('submit', function (e) {
            e.preventDefault();
            var formFields = $(this).serializeArray();

            var formData = {};
            $(formFields).each(function (index, obj) {
                formData[obj.name] = obj.value;
            });

            formData.fromDate = ACC.mypages.getDate(dateFrom);
            formData.toDate = ACC.mypages.getDate(dateTo);

            var data = JSON.stringify(formData);

            ACC.mypages.getActivitiesData('/rest/activity/list', data);
        });
    },

    setQueryParams: function () {
        // as IE do not support UrlSearchParams ...
        var urlParams = window.location.search;
        if (!!urlParams) {
            urlParams = decodeURIComponent(urlParams.substring(1, urlParams.length));
            var params = urlParams.split('&');
            params.forEach(function (param) {
                var paramArray = param.split('=');
                var inputField = $("input[name='" + paramArray[0] + "']");
                inputField.val(paramArray[1]);
                ACC.mypages.urlParams[paramArray[0]] = paramArray[1];
            })
        }
    },

    triggerInitialSearch: function () {
        var jsSearchOrdersAdvanced = $('.js-search-orders-advanced');
        var jsSearchActivities = $('.js-search-activities');

        if (jsSearchOrdersAdvanced.length > 0) {
            jsSearchOrdersAdvanced.submit();
        }

        if (jsSearchActivities.length > 0) {
            jsSearchActivities.submit();
        }
    },

    getOrdersData: function (url, params) {
        $('.js-orders-list').empty();
        $('.js-empty-list').addClass('hidden');
        $('.js-loader').removeClass('hidden');
        $('.js-order-all-certificates').addClass('hidden');

        $.ajax({
            'type': 'POST',
            'url': ACC.config.encodedContextPath + url,
            'data': params,
            'contentType': 'application/json',
            'headers': {
                'CSRFToken': ACC.config.CSRFToken
            },
            success: function (data) {
                if (data && data.length > 0) {
                    var orderId = $('.js-orders-list').data('order');

                    if (orderId) {
                        for (var i = 0; i < data.length; i++) {
                            if (data[i].documentNumber === orderId) {
                                data[i].opened = true;
                            }
                        }
                    }

                    ACC.mypages.appendOrderRows(data);
                    $('.js-order-all-certificates').removeClass('hidden');
                    $('.js-orders-list-amount').text(data.length);
                } else {
                    $('.js-empty-list').removeClass('hidden');
                    $('.js-orders-list-amount').text('0');
                }
            },
            error: function (xht, textStatus, ex) {
                $('.js-empty-list').removeClass('hidden');
                $('.js-orders-list-amount').text('0');
                console.log("Failed to retrieve order rows. Error details [" + xht + ", " + textStatus + ", " + ex + "]");
            },
            complete: function () {
                $('.js-loader').addClass('hidden');
            }
        });
    },

    getActivitiesData: function (url, params) {
        $('.js-activities-list').empty();
        $('.js-empty-list').addClass('hidden');
        $('.js-loader').removeClass('hidden');

        $.ajax({
            'type': 'POST',
            'url': ACC.config.encodedContextPath + url,
            'data': params,
            'contentType': 'application/json',
            'headers': {
                'CSRFToken': ACC.config.CSRFToken
            },
            success: function (data) {
                if (data && data.length > 0) {
                    ACC.mypages.appendActivitiesRows(data);
                    $('.js-activities-list-amount').text(data.length);
                } else {
                    $('.js-empty-list').removeClass('hidden');
                    $('.js-activities-list-amount').text('0');
                }

                // open activity if url has param activity_id
                var activity_id = ACC.mypages.urlParams.activity_id;
                if (activity_id) {
                    var row = $('.js-activities-list').find('.js-activity-row[data-id="' + activity_id + '"]');
                    if (row.length) {
                        ACC.mypages.openActivitiesDetails(row);
                        ACC.mypages.urlParams.activity_id = undefined;
                    }
                }

            },
            error: function (xht, textStatus, ex) {
                $('.js-empty-list').removeClass('hidden');
                $('.js-activities-list-amount').text('0');
                console.log("Failed to retrieve order rows. Error details [" + xht + ", " + textStatus + ", " + ex + "]");
            },
            complete: function () {
                $('.js-loader').addClass('hidden');
            }
        });
    },

    appendOrderRows: function (orderRows) {
        var ordersTpl = $('#ordersListTpl').html();
        var template = Handlebars.compile(ordersTpl);
        var orders = template({ orderRows });

        $('.js-orders-list').append(orders);
        ACC.mypages.openSelectedOrder();
    },

    openSelectedOrder: function () {
        $('.js-orders-row').each(function () {
            var row = $(this);

            if (row.hasClass('opened')) {
                row.trigger('click');
                return false;
            }
        })
    },

    openActivitiesDetails: function (row) {
        row.siblings().removeClass('expanded').find('.js-activity-details').slideUp();
        row.toggleClass('expanded').find('.js-activity-details').slideToggle();

        if (row.find('.js-loader').length > 0) {
            row.find('.js-activity-error').addClass('hidden');
            row.find('.js-loader').removeClass('hidden');
            var activityId = row.data('id');
            ACC.mypages.getActivityData(activityId, row);
        }
    },

    appendActivitiesRows: function (activityRows) {
        var activitiesTpl = $('#activitiesListTpl').html();
        var template = Handlebars.compile(activitiesTpl);
        var activities = template({activityRows: activityRows});

        $('.js-activities-list').append(activities);
    },

    getOrderData: function (orderId, purchaseId, row) {
        $.ajax({
            'type': 'GET',
            'url': ACC.config.encodedContextPath + '/rest/order/details/' + orderId,
            'contentType': 'application/json',
            success: function (data) {
                if (data && data.orderType) {
                    var downloadCertificates = false;
                    for (var i = 0; i < data.entries.length; i++) {
                        data.entries[i].materialCode = data.entries[i].materialCode.replace(/^0+/, '');

                        if (data.entries[i].certificates.length > 0 && !downloadCertificates) {
                            downloadCertificates = true;
                        }
                    }
                    ACC.mypages.appendOrderRow(data, row, orderId, purchaseId);
                    if (downloadCertificates) {
                        $('.js-order-certificates').removeClass('hidden');
                    }
                }
            },
            error: function (data) {
                row.find('.js-order-error').removeClass('hidden').text(data.responseJSON);
            },
            complete: function () {
                row.find('.js-loader').remove();
            }
        });
    },

    getActivityData: function (activityId, row, update) {
        $.ajax({
            'type': 'POST',
            'url': ACC.config.encodedContextPath + '/rest/activity/details',
            'data': '{ "activityNumber": "' + activityId + '" }',
            'contentType': 'application/json',
            success: function (data) {
                if (data && data.activityNumber) {
                    data.description = data.description.replaceAll('\r\n', '<br>').replaceAll('\n', '<br>');
                    if (!!data.responseText) {
                        data.responseText = data.responseText.replaceAll('\r\n', '<br>').replaceAll('\n', '<br>');
                    }
                    ACC.mypages.appendActivityRow(data, row, update);

                    const $notification = row.find('.js-activity-notification');
                    if ($notification.length > 0) {
                        $notification.remove();
                    }

                    const $otherNotifications = $('.js-activity-notification');
                    if ($otherNotifications.length === 0) {
                        $('.js-ticket-notification').remove();
                    }
                }
            },
            error: function (data) {
                row.find('.js-activity-error').removeClass('hidden').text(data.responseJSON);
            },
            complete: function () {
                row.find('.js-loader').remove();
            }
        });
    },

    appendOrderRow: function (data, row, orderId, purchaseId) {
        var template, details;

        if (data.orderType === "ORDER" || data.orderType === "ORDERFROMQUOTE") {
            var orderTpl = $('#orderTpl').html();
            template = Handlebars.compile(orderTpl);
            details = template({
                orderDetails: data,
                purchaseId: purchaseId,
                orderID: orderId
            });
        } else if (data.orderType === "QUOTE") {
            var quoteTpl = $('#quoteTpl').html();
            template = Handlebars.compile(quoteTpl);
            details = template({
                quoteDetails: data,
                purchaseId: purchaseId,
                orderID: orderId
            });
        } else {
            return;
        }

        row.find('.js-order-details').append(details);

        if (data.orderType === 'QUOTE') {
            if (row.data('approved')) {
                row.find('.js-quote-approved').removeClass('hidden');
            } else {
                row.find('.js-quote-approve').removeClass('hidden');
            }
        }
    },


    appendActivityRow: function (data, row, update) {
        var activityTpl = $('#activityTpl').html();
        var template = Handlebars.compile(activityTpl);
        data.conversation.forEach(function (item) {
            item.userName = item.userName || ACC.text.activityConversationCompanyUser;
        })
        var details = template({
            activityDetails: data
        });

        if (update) {
            row.find('.js-activity-details .mypage__section').remove();
        }
        row.find('.js-activity-details').append(details);
    },

    setDisableOrderStatusButtons: function (status) {
        $('.js-add-entry-from-order-status').prop('disabled', status);
        $('.js-order-create-cart').prop('disabled', status);
    },

    bindUI: function () {
        var jsOrdersList = $('.js-orders-list');
        var jsActivitiesList = $('.js-activities-list');
        var jsMultiUploadFiles = $('.js-multi-upload-files');

        $('.js-mypage-collapse-trigger').on('click', function () {
            $('.js-mypage-collapse-content').slideToggle();
        });

        jsOrdersList.on('click', '.js-orders-row', function () {
            var row = $(this);

            row.siblings().removeClass('expanded').find('.js-order-details').slideUp();
            row.toggleClass('expanded').find('.js-order-details').slideToggle();

            if (row.find('.js-loader').length > 0) {
                row.find('.js-order-error').addClass('hidden');
                row.find('.js-loader').removeClass('hidden');
                var orderId = row.data('id');
                var purchaseId = row.data('purchase');
                ACC.mypages.getOrderData(orderId, purchaseId, row);
            }
        });

        jsOrdersList.on('click', '.js-order-item-docs-btn', function (e) {
            e.stopPropagation();
            var modal = $(e.target).next('.js-order-item-docs');
            $('.js-order-item-docs').not(modal).addClass('hidden');
            modal.toggleClass('hidden');
        });

        jsOrdersList.on('click', '.js-add-entry-from-order-status', function (e) {
            e.stopPropagation();
            ACC.mypages.setDisableOrderStatusButtons(true);

            const entryNumber = $(this).data('entry-number');
            const orderId = $(this).parents('.js-orders-row').data('id');

            const requestUrl = `${ACC.config.encodedContextPath}/rest/cart/order-template/${orderId}/${entryNumber}`;

            $.ajax({
                'type': 'POST',
                'url': requestUrl,
                'contentType': 'application/json',
                'headers': {
                    'CSRFToken': ACC.config.CSRFToken
                },
                success: function (data) {
                    if(data.skippedProducts.length > 0 || data.skippedRemnants.length > 0 ) {
                        window.location.reload();
                    }
                    ACC.minicart.updateMiniCartDisplay();
                },
                error: function (xht, textStatus, ex) {
                    window.location.reload();
                },
                complete: function () {
                    ACC.mypages.setDisableOrderStatusButtons(false);
                }
            });
        });


        jsOrdersList.on('click', '.js-order-create-cart', function (e) {
            e.stopPropagation();
            ACC.mypages.setDisableOrderStatusButtons(true);

            var btn = $(this);
            var orderId = btn.data('id');
            var url = btn.data('url');
            ACC.mypages.createCartFromOder(orderId, url, btn);
        });

        jsOrdersList.on('click', '.js-order-item-invoice', function (e) {
            e.stopPropagation();

            var btn = $(this);
            var invoiceId = btn.data('id');
            ACC.mypages.downloadFile(invoiceId, 'invoice', btn);
        });

        jsOrdersList.on('click', '.js-order-item-delivery', function (e) {
            e.stopPropagation();

            var btn = $(this);
            var deliveryId = btn.data('id');
            ACC.mypages.downloadFile(deliveryId, 'deliveryNote', btn);
        });

        jsOrdersList.on('click', '.js-order-item-certificate', function (e) {
            e.stopPropagation();

            var btn = $(this);
            var orderId = btn.data('id');
            var certificateId = btn.data('certificate');
            var entryId = btn.data('entry')
            ACC.mypages.downloadFile(orderId, 'certificate', btn, entryId, certificateId);
        });

        jsOrdersList.on('click', '.js-certificate-select', function(e) {
            // this stops only partially - the checkbox click is still triggered (handle the logic there)
            e.stopPropagation();
        });

        jsOrdersList.on('click', '.js-certificate-checkbox', function(e) {
            e.stopPropagation();

            let $checkbox = $(this);
            let $btn = $checkbox.parent().find('.js-certificate-select');
            $btn.toggleClass("selected", this.checked);
            let $orderDetails = $checkbox.closest(".js-order-details");
            let anySelected = $orderDetails.find(".js-certificate-checkbox:checked").length > 0;
            $orderDetails.find('.js-certificates-order-selected').prop("disabled", !anySelected);
        });
        jsOrdersList.on('click', '.js-certificates-order-selected', function(e) {
            e.stopPropagation();

            let $btn = $(this);
            let referenceOrderNumber = $btn.data('id')

            let selectedValues = []
            let $orderDetails = $btn.closest(".js-order-details");
            $orderDetails.find(".js-certificate-checkbox:checked").each(function () {
                selectedValues.push(this.value);
            });
            ACC.mypages.createCertificateCart($orderDetails, referenceOrderNumber, selectedValues);
        });

        jsOrdersList.on('click', '.js-order-confirmation', function (e) {
            e.stopPropagation();

            var btn = $(this);
            var orderId = btn.data('id');
            ACC.mypages.downloadFile(orderId, 'orderConfirmation', btn);
        });
        jsOrdersList.on('click', '.js-order-certificates', function (e) {
            e.stopPropagation();

            var btn = $(this);
            var orderId = btn.data('id');
            var purchaseId = btn.data('purchase');
            ACC.mypages.downloadFile(orderId, 'orderCertificates', btn, purchaseId);
        });

        jsOrdersList.on('click', '.js-quote-download', function (e) {
            e.stopPropagation();

            var btn = $(this);
            var quoteId = btn.data('id');
            ACC.mypages.downloadFile(quoteId, 'quote', btn);
        });

        $('.js-order-all-certificates').on('click', function () {
            ACC.mypages.getAllCertificates();
        });

        jsActivitiesList.on('click', '.js-activity-row', function () {
            var row = $(this);
            ACC.mypages.openActivitiesDetails(row);
        });

        jsActivitiesList.on('click', '.js-activity-attachment', function (e) {
            e.stopPropagation();
            let id = $(this).closest('li').data('id');
            let attachment = $(this).data('attachment');
            let clickedAttachment = $(this).text();
            ACC.mypages.downloadActivityAttachment(attachment, id, clickedAttachment);
        });

        jsActivitiesList.on('click', '.js-comment-to-ticket', function (e) {
            e.stopPropagation();

            var id = $(this).data('id');
            ACC.mypages.createTicket(id, 'COMMENT');
        });

        jsOrdersList.on('click', '.js-quote-approve', function (e) {
            e.stopPropagation();

            var id = $(this).data('id');
            var reference = $(this).data('reference');
            ACC.mypages.approveQuote(id, reference);
        });

        jsOrdersList.on('click', '.js-create-ticket', function (e) {
            e.stopPropagation();

            var id = $(this).data('id');
            var type = $(this).data('type');
            ACC.mypages.createTicket(id, type);
        });

        $('.js-create-ticket').on('click', function (e) {
            e.preventDefault();
            ACC.mypages.createTicket('');
        });

        $('.js-create-product-ticket').on('click', function (e) {
            e.preventDefault();
            var id = $(this).data('id');
            var type = $(this).data('type');
            ACC.mypages.createTicket(id, type);
        });

        jsOrdersList.on('click', '.js-deviation-report', function (e) {
            e.stopPropagation();

            var id = $(this).data('id');
            var type = $(this).data('type');
            ACC.mypages.deviationReport(id, type);
        });

        $('.js-multi-upload-add').on('click', function (e) {
            e.preventDefault();

            ACC.mypages.addAdditionalFile();
        });

        jsMultiUploadFiles.on('click', '.js-multi-upload-remove', function (e) {
            e.preventDefault();

            $(this).closest('.js-multi-upload-file').remove();
            $.colorbox.resize();
        });

        jsMultiUploadFiles.on('change', '.js-multi-upload-file-input', function () {
            var fileName = $(this).val().split(/(\\|\/)/g).pop();
            $(this).parents('.mypage__files__file').find('.js-multi-upload-name').text(fileName);
        });
    },

    createCartFromOder: function (orderId, url, btn) {
        $('.js-order-error').addClass('hidden');

        $.ajax({
            'type': 'POST',
            'url': ACC.config.encodedContextPath + '/rest/cart/orderTemplate',
            'data': '{ "orderId": "' + orderId + '" }',
            'contentType': 'application/json',
            'headers': {
                'CSRFToken': ACC.config.CSRFToken
            },
            success: function () {
                window.location = url;
            },
            error: function (data) {
                btn.closest('.js-order-details').find('.js-order-error').text(data.responseJSON).removeClass('hidden');
            },
            complete: function () {
                ACC.mypages.setDisableOrderStatusButtons(false);
            }
        });
    },

    downloadFile: function (id, type, btn, secondId, thirdId) {
        var url = '';
        var fileName = '';
        $('.js-download-info').fadeIn().css('display', 'flex');

        if (type === 'invoice') {
            url = '/rest/order/details/invoice/' + id;
            fileName = 'invoice-' + id + '.pdf';
        } else if (type === 'deliveryNote') {
            url = '/rest/order/details/delivery_note/' + id;
            fileName = 'delivery-note-' + id + '.pdf';
        } else if (type === 'certificate') {
            url = '/rest/order/details/order/' + id + '/entry/' + secondId + '/cert/' + thirdId;
            fileName = 'cartificate-' + id + '.pdf';
        } else if (type === 'orderConfirmation') {
            url = '/rest/order/details/order/' + id;
            fileName = 'order-confirmation-' + id + '.pdf';
        } else if (type === 'orderCertificates') {
            url = '/rest/order/details/order/' + id + '/certs?purchaseOrderNumber=' + secondId;
            fileName = 'cart-' + id + '.pdf';
        } else if (type === 'quote') {
            url = '/rest/order/details/quote/' + id;
            fileName = 'quote-' + id + '.pdf';
        }

        var req = new XMLHttpRequest();
        req.open('GET', ACC.config.encodedContextPath + url, true);
        req.responseType = 'blob';
        req.onload = function () {
            $('.js-download-info').fadeOut();

            var blob = req.response;
            if (blob && req.status === 200) {
                var fileName = ACC.mypages.resolveFileName(req, fileName);

                ACC.mypages.openDownloadDialogue(blob, fileName);
            } else {
                btn.closest('.js-order-details').find('.js-order-error-file-download').removeClass('hidden');
                setTimeout(function () {
                    btn.closest('.js-order-details').find('.js-order-error-file-download').addClass('hidden');
                }, 6000)
            }
        };

        req.send();
    },

    downloadFileByParams: function (data, type) {
        $('.js-download-info').fadeIn().css('display', 'flex');

        var req = new XMLHttpRequest();
        req.open('POST', ACC.config.encodedContextPath + '/rest/order/list/' + type + '/certs', true);
        req.setRequestHeader('CSRFToken', ACC.config.CSRFToken);
        req.setRequestHeader('Content-Type', 'application/json');
        req.responseType = 'blob';
        req.onload = function () {
            $('.js-download-info').fadeOut();

            var blob = req.response;
            if (blob && req.status === 200) {
                var fileName = ACC.mypages.resolveFileName(req, 'certificates.zip');

                ACC.mypages.openDownloadDialogue(blob, fileName);
            } else {
                $('.js-orders-error').removeClass('hidden');
                setTimeout(function () {
                    $('.js-orders-error').addClass('hidden');
                }, 6000)
            }
        };

        req.send(data);
    },

    downloadActivityAttachment: function (attachment, id, clickedAttachment) {
        var req = new XMLHttpRequest();
        req.open('POST', ACC.config.encodedContextPath + '/rest/activity/attachment', true);
        req.setRequestHeader('CSRFToken', ACC.config.CSRFToken);
        req.setRequestHeader('Content-Type', 'application/json');
        req.responseType = 'blob';
        req.onload = function () {
            var blob = req.response;
            if (blob && req.status === 200) {
                var fileName = ACC.mypages.resolveFileName(req, 'activity-' + attachment.activityNumber + '.bin');

                ACC.mypages.openDownloadDialogue(blob, fileName);
            } else {
                $('.js-activity-error').removeClass('hidden');
                setTimeout(function () {
                    $('.js-activity-error').addClass('hidden');
                }, 4000)
            }
        };

        delete attachment.fileName;
        attachment.activityNumber = id;
        attachment.number = clickedAttachment.replace(/\s/g,'');
        attachment = JSON.stringify(attachment);
        req.send(attachment);
    },

    openDownloadDialogue: function (blob, fileName) {
        if (window.navigator && window.navigator.msSaveBlob) {
            window.navigator.msSaveBlob(blob, fileName);
        } else {
            var fileUrl = window.URL.createObjectURL(blob);
            var file = $('<a style="display: none;"/>');
            file.attr('href', fileUrl);
            file.attr('download', fileName);
            $('body').append(file);
            file[0].click();
            window.URL.revokeObjectURL(fileUrl);
            file.remove();
        }
    },

    getAllCertificates: function () {
        var form = $('.js-search-type-params:not(.hidden)');
        var dateFrom = $('.js-search-orders-from');
        var dateTo = $('.js-search-orders-to');
        var data = '';

        if (form.hasClass('js-search-orders-advanced')) {
            var formFields = form.serializeArray();

            var formData = {};
            $(formFields).each(function (index, obj) {
                if (obj.value) {
                    formData[obj.name] = obj.value;
                }
            });

            formData.fromDate = ACC.mypages.getDate(dateFrom);
            formData.toDate = ACC.mypages.getDate(dateTo);

            data = JSON.stringify(formData);

            ACC.mypages.downloadFileByParams(data, 'general');
        } else {
            var chargeNumber = $('.js-search-orders-charge-number').val();

            data = '{"chargeNumber":"' + chargeNumber + '"}';

            ACC.mypages.downloadFileByParams(data, 'charge-number');
        }
    },

    createCertificateCart: function($orderDetails, referenceOrderNumber, entryNumbers) {
        let formData = {};
        formData.referenceOrderNumber = referenceOrderNumber;
        formData.entryNumbers = entryNumbers;

        // $orderDetails.find('.js-certificates-order-selected').addClass('hidden');

        $.ajax({
            'type': 'POST',
            'url': ACC.config.encodedContextPath + '/rest/certificates',
            'data': JSON.stringify(formData),
            'contentType': 'application/json',
            'headers': {
                'CSRFToken': ACC.config.CSRFToken
            },
            beforeSubmit: function() {
                $orderDetails.find('.js-certificates-order-selected').block
            },
            success: function (data) {
                if (data.redirectUrl) {
                    window.location = data.redirectUrl;
                } else {
                    $orderDetails.find('.js-certificates-order-error').removeClass('hidden');
                }
            },
            error: function (data) {
                $orderDetails.find('.js-certificates-error').text(data.responseJSON).removeClass('hidden');
            },
            complete: function() {

            }
        });
    },

    approveQuote: function (id, reference) {
        $('.js-quote-approve-error, .js-quote-approve-confirm').addClass('hidden');
        $('.js-quote-approve-form').removeClass('hidden');

        $('.js-quote-approve-number').val(id);
        $('.js-quote-approve-reference').val(reference);


        var datePicker = $('.js-quote-approve-date');

        datePicker.datepicker('destroy');
        ACC.configurator.findDeliveryDates(datePicker, id);

        $.colorbox({
            href: '.js-quote-approve-box',
            inline: true,
            opacity: 0.7,
            width: '500px',
            maxWidth: '100%',
            maxHeight: '100%',
            close: '',
            title: $('.js-quote-approve-header').html()
        });

        $('.js-quote-approve-send').on('click', function (e) {
            e.preventDefault();

            var btn = $(this);
            btn.addClass('disabled');

            var formFields = $('.js-quote-approve-form').serializeArray();

            var formData = {};
            $(formFields).each(function (index, obj) {
                formData[obj.name] = obj.value;
            });

            var date = datePicker.datepicker('getDate');
            date = $.datepicker.formatDate('yy-mm-dd', date);
            formData['requestedDeliveryDate'] = date;

            var data = JSON.stringify(formData);

            $.ajax({
                'type': 'POST',
                'url': ACC.config.encodedContextPath + '/rest/order/details/quote/convert',
                'data': data,
                'contentType': 'application/json',
                'headers': {
                    'CSRFToken': ACC.config.CSRFToken
                },
                success: function (data) {
                    $('.js-quote-approve-form, .js-quote-approve-confirm').toggleClass('hidden');
                    $('.js-quote-approve-order').text(data.orderId);
                    $.colorbox.resize();
                },
                error: function (data) {
                    $('.js-quote-approve-error').html(data.responseJSON).removeClass('hidden');
                    btn.removeClass('disabled');
                    $.colorbox.resize();
                }
            });
        });

        $('.js-quote-approve-cancel').on('click', function (e) {
            e.preventDefault();
            $.colorbox.close();
        });

        $('.js-quote-approve-close').on('click', function (e) {
            e.preventDefault();
            $.colorbox.close();
            $('.js-search-type-params:not(.hidden)').submit();
        });
    },

    bindTicketForm: function () {
        if ($('.js-ticket-types').length > 0) {
            $.ajax({
                'type': 'GET',
                'url': ACC.config.encodedContextPath + '/rest/activity/reportTypes',
                'contentType': 'application/json',
                success: function (data) {
                    if (data && data.length > 0) {
                        var types = '';

                        for (var i = 0; i < data.length; i++) {
                            types += '<option value="' + (data[i].reportType || '') + '">' + data[i].message + '</option>';
                        }
                        $(types).appendTo('.js-ticket-types');
                    }
                },
                error: function (xht, textStatus, ex) {
                    console.log("Failed to get deviation types. Error details [" + xht + ", " + textStatus + ", " + ex + "]");
                }
            });
        }

        var jsTicketSend = $('.js-ticket-send');

        jsTicketSend.on('click', function (e) {
            e.preventDefault();

            var redirectUrl = $(this).data('url');

            jsTicketSend.addClass('disabled');
            $('.js-ticket-error, .js-ticket-success').addClass('hidden');

            var form = $(this).closest('.js-ticket-form');
            var formType = form.data('type');
            var formFields = form.serializeArray();
            var formData = new FormData();
            var files = [];
            var filesSize = 0;
            var url = ACC.config.encodedContextPath;

            form.find('.js-multi-upload-file').each(function () {
                var field = $(this);
                var file = field.find('.js-multi-upload-file-input').val();

                if (file) {
                    file = field.find('.js-multi-upload-file-input')[0].files[0];
                    var description = field.find('.js-multi-upload-description').val();
                    var obj = {
                        'file': file,
                        'description': description
                    };
                    files.push(obj);
                }
            });

            if (files.length) {
                files.forEach(function (item, i) {
                    filesSize += files[i].file.size;
                });
            }
            ;

            if (filesSize > 25000000) {
                $('.js-ticket-files-error').removeClass('hidden');
                $('.js-ticket-send').removeClass('disabled');
                $.colorbox.resize();
            } else {
                $(formFields).each(function (index, obj) {
                    formData.append(obj.name, obj.value);
                });

                if (formFields.find(function (e) {
                    return e.name === 'deviationType'
                })) {
                    url += '/rest/order/details/order/activity/deviation';
                } else if (formType === 'ticket') {
                    if (formFields[1].value === 'SALES_ORDER' || formFields[1].value === 'QUOTATION') {
                        url += '/rest/order/details/order/activity/message';
                    } else if (formFields[1].value === 'PRODUCT') {
                        url += '/rest/activity/action/purchase';
                    } else if (formFields[1].value === 'COMMENT') {
                        var newData = new FormData();
                        $(formFields).each(function (index, obj) {
                            var nameObj = obj.name === 'documentId' ? 'activityId' : obj.name;
                            if (nameObj !== 'orderType') {
                                newData.append(nameObj, obj.value);
                            }
                        });
                        formData = newData;
                        url += '/rest/activity/action/reply';
                    } else {
                        url += '/rest/activity/action/support';
                    }
                }

                if (files.length) {
                    files.forEach(function (item, i) {
                        formData.append('files[' + i + '].file', files[i].file);
                        formData.append('files[' + i + '].description', files[i].description);
                    });
                };

                $.ajax({
                    'type': 'POST',
                    'url': url,
                    'data': formData,
                    'processData': false,
                    'contentType': false,
                    'headers': {
                        'CSRFToken': ACC.config.CSRFToken
                    },
                    success: function () {
                        $('.js-ticket-success').removeClass('hidden');
                        $.colorbox.resize();

                        setTimeout(function () {
                            if (formType !== 'COMMENT' && redirectUrl) {
                                window.location = redirectUrl;
                            } else {
                                $.colorbox.close();
                                $('.js-ticket-message, .js-ticket-title').val('');
                            }
                        }, 2500);

                        if (formFields[1].value === 'COMMENT') {
                            var expandedRow = $('.js-activity-row.expanded')
                            var activityId = expandedRow.data('id');
                            ACC.mypages.getActivityData(activityId, expandedRow, true);
                        }

                        ACC.dashboard.handleActivity(true);
                    },
                    error: function (data) {
                        ACC.navigation.handleSessionError(data, 403);

                        var errorMessage = ACC.common.parseErrorMessages(data);
                        $('.js-ticket-error').removeClass('hidden').html(errorMessage);
                        $('.js-ticket-send').removeClass('disabled');
                        $.colorbox.resize();
                    }
                });
            }
        });

        $('.js-ticket-cancel').on('click', function (e) {
            e.preventDefault();
            $.colorbox.close();
        });

        $('.js-c-block').on('click', function (e) {
            e.preventDefault();
            const $this = $(this);
            const $redirect = $this.data("contactUrl")
            if ($redirect !== undefined) {
                window.location.href = $redirect;
                return;
            }
            $.colorbox({
                inline: true,
                opacity: 0.7,
                width: '500px',
                height: '350px',
                maxWidth: '100%',
                maxHeight: '100%',
                close: '',
                title: $('.js-cblock-header').html()
            });
            ACC.mypages.createTicketCBlock();
        });
    },

    createTicket: function (id, type) {
        $('.js-ticket-error, .js-ticket-files-error, .js-ticket-success, .js-ticket-title-headline, .js-ticket-add-comment-success').addClass('hidden');
        $('.js-ticket-send').removeClass('disabled');
        $('.js-ticket-title').val('');

        if (type !== 'COMMENT') {
            $('.form-group-title, .js-ticket-send-and-hide, .js-ticket-created-success, .js-ticket-title').removeClass('hidden');
        }

        if (type === 'SALES_ORDER') {
            $('.js-ticket-title-order').removeClass('hidden');
            $('.js-ticket-title').val($('.js-ticket-label-order').text() + id);
        } else if (type === 'QUOTATION') {
            $('.js-ticket-title-quote').removeClass('hidden');
            $('.js-ticket-title').val($('.js-ticket-label-quote').text() + id);
        } else if (type === 'PRODUCT') {
            let idFormatted = String(id);
            idFormatted = idFormatted.replace(/^0+/, '');
            $('.js-ticket-title-support').removeClass('hidden');
            $('.js-ticket-title').val($('.js-ticket-label-product').text() + idFormatted);
        } else if (type === 'COMMENT') {
            $('.js-ticket-title-add-comment, .js-ticket-add-comment-success').removeClass('hidden');
            $('.form-group-title, .js-ticket-send-and-hide, .js-ticket-created-success').addClass('hidden');
            $('.js-ticket-title').val('Reply').addClass('hidden');
        } else {
            $('.js-ticket-title-support').removeClass('hidden');
        }

        if (id) {
            $('.js-ticket-id').val(id).removeAttr('disabled');
        } else {
            $('.js-ticket-id').attr('disabled', 'disabled');
        }

        if (type) {
            $('.js-ticket-type').val(type).removeAttr('disabled');
        } else {
            $('.js-ticket-type').attr('disabled', 'disabled');
        }

        $.colorbox({
            href: '.js-ticket-box',
            inline: true,
            opacity: 0.7,
            width: '500px',
            maxWidth: '100%',
            maxHeight: '100%',
            close: '',
            title: $('.js-ticket-header').html()
        });

        $('.js-multi-upload-files').empty();
        ACC.mypages.addAdditionalFile();
    },

    createTicketCBlock: function () {
        var url = ACC.config.encodedContextPath + '/rest/activity/action/creditBlock';
        $.ajax({
            'type': 'GET',
            'url': url,
            'processData': false,
            'contentType': false,
            'headers': {
                'CSRFToken': ACC.config.CSRFToken
            },
            success: function () {

            },
            error: function (data) {
                ACC.navigation.handleSessionError(data, 403);
            }
        });
    },

    deviationReport: function (id, type) {
        $('.js-ticket-error, .js-ticket-files-error, .js-ticket-success').addClass('hidden');
        $('.js-ticket-send').removeClass('disabled');

        if (id) {
            $('.js-ticket-id').val(id);
        } else {
            $('.js-ticket-id').attr('disabled', 'disabled');
        }

        if (type) {
            $('.js-ticket-type').val(type);
        } else {
            $('.js-ticket-type').attr('disabled', 'disabled');
        }

        $.colorbox({
            href: '.js-deviation-box',
            inline: true,
            opacity: 0.7,
            width: '800px',
            maxWidth: '100%',
            maxHeight: '100%',
            close: '',
            title: $('.js-deviation-header').html()
        });

        $('.js-multi-upload-files').empty();
        ACC.mypages.addAdditionalFile();
    },
    resolveFileName: function (request, defaultFileName) {
        var regex = /filename[^;=\n]*=['"]([^;\n]*)['"]/;
        var headerValue = request.getResponseHeader('Content-Disposition');
        var matches = regex.exec(headerValue);

        return !!matches[1] ? matches[1] : defaultFileName;
    },

    addAdditionalFile: function () {
        $($('#multiUploadFile').html()).appendTo($('.js-multi-upload-files'));
        $.colorbox.resize();
    }
};
