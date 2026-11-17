ACC.common = {
    _autoload: [
        "bindCommon",
        "readMoreCatPopup",
        "bindCustomAccordion",
        "bindPanel",
        "bindCustomTooltip",
        ["closeSapFormMessage", $(".sapCpContentPage").length !== 0]
    ],

    panelProgres: false,
    currentCurrency: $("main").data('currencyIsoCode') || "USD",
    processingMessage: $("<img>").attr("src", ACC.config.commonResourcePath + "/images/spinner.gif"),

    bindCommon: () => {
        $(document).on('click', '[data-panel-nav="login-panel"]', e => {
            e.preventDefault(); 
        })
    },

    blockFormAndShowProcessingMessage: function (submitButton) {
        var form = submitButton.parents('form:first');
        form.block({message: ACC.common.processingMessage});
    },

    refreshScreenReaderBuffer: function () {
        // changes a value in a hidden form field in order
        // to trigger a buffer update in a screen reader
        $('#accesibility_refreshScreenReaderBufferField').attr('value', new Date().getTime());
    },

    checkAuthenticationStatusBeforeAction: function (actionCallback) {
        $.ajax({
            url: ACC.config.authenticationStatusUrl,
            statusCode: {
                401: function () {
                    location.href = ACC.config.loginUrl;
                }
            },
            dataType: 'json',
            success: function (data) {
                if (data == "authenticated") {
                    actionCallback();
                }
            }
        });
    },

    encodeHtml: function (rawText) {
        return rawText.toString()
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/\//g, '&#47;');
    },

    setCalendarLocale: function (lang) {
        if (lang === 'sv_SE' || lang === 'nb_NO' || lang === 'da_DK' || lang === 'fi_FI') {
            !function (e) {
                "function" == typeof define && define.amd ? define(["../widgets/datepicker"], e) : e(jQuery.datepicker)
            }(function (e) {
                return e.regional[lang] = ACC.common[lang], e.setDefaults(e.regional[lang]), e.regional[lang]
            });
        }
    },

    parseErrorMessages: function (data) {
        var errors = data.responseJSON?.errors;
        var errorMsg = data.responseJSON?.errorMessage;

        if(errors && errors.length > 0) {
            var errorMessage = '';

            for (var i = 0; i < errors.length; i++) {
                errorMessage += errors[i].message + '<br>';
            }

            return errorMessage;
        } else if (errorMsg) {
            return errorMsg;
        }

        return data.responseJSON;
    },

    hasCreditBlockError: function (data) {
        if ('credit-block' == data.responseText) {
            return true;
        }
        return false;
    },

    readMoreCatPopup: function (setAndReload) {
        var readMore = '.js-read-more-btn';

        $('body').on('click', readMore, function(e) {
            e.preventDefault();
            var title = '<h2>' +  
                            (
                                $(this).data('title') || 
                                $(this).parents('.js-read-more').find('.js-read-more-title').html()
                            ) + 
                        '</h2>';
            var readMoreContent = $(this).data('text') || $('#' + $(this).data('jstemplate')).html();
            $.colorbox({
                href: '<div>' + title + readMoreContent + '</div>',
                inline: true,
                opacity: 0.7,
                width: '700px',
                maxWidth: '90%',
                maxHeight: '90%',
                close: ACC.text.popupClose,
                onComplete: function () {
                    $('#cboxLoadedContent').css('margin-top', '10px');
                }
            });
        })
    },

    addressPopup: function (onSelectFunction) {

        function createAddressItem(data) {
            var selected = $('.js-change-address-list').data('selected') === data.sapCode;

            var addressItem = `<li class="address__list__item js-change-address-item" data-selected="${selected}" data-code="${data.sapCode}"><div>`
            if (data.companyName) {
                addressItem += `<span>${data.companyName}</span>`
            }
            if (data.line1) {
                addressItem += `<span>${data.line1}</span>`;
            }
            if (data.line2) {
                addressItem += `<span>${data.line2}</span>`;
            }
            if (data.postalCode && data.town && data.country) {
                addressItem += `<span>${data.postalCode} ${data.town}, ${data.country.name}</span>`;
            }
            addressItem += '</div></li>';
            return addressItem;
        }

        $.ajax({
            'type': 'GET',
            'url': ACC.config.encodedContextPath + '/rest/cart/address',
            'contentType': 'application/json',
            'headers': {
                'CSRFToken': ACC.config.CSRFToken
            },
            success: function (data) {
                var addressData = '';

                for (var i = 0; i < data.length; i++) {
                    addressData += createAddressItem(data[i])
                }

                $('.js-change-address-list').empty();
                $(addressData).appendTo($('.js-change-address-list'));

                $.colorbox({
                    href: '.js-change-address',
                    inline: true,
                    opacity: 0.7,
                    width: '700px',
                    maxWidth: '100%',
                    height: 'auto',
                    maxHeight: '640px',
                    close: '',
                    title: $('.js-change-address-header').html()
                });

                $('.js-change-address-error').addClass('hidden');
                $('.js-change-address-list').removeClass('hidden');
                $('.js-change-address-search').val('');
            }
        });

        $('.js-change-address-search').on('input', function () {
            var keyword = $(this).val().toUpperCase();
            var items = 0;

            $('.js-change-address-item').each(function () {
                var item = $(this);
                var text = item.text().toUpperCase();

                if (text.indexOf(keyword) > -1) {
                    item.removeClass('hidden');
                    items += 1;
                } else {
                    item.addClass('hidden');
                }
            });

            if (items === 0) {
                $('.js-change-address-error').removeClass('hidden');
                $('.js-change-address-list').addClass('hidden');
            } else {
                $('.js-change-address-error').addClass('hidden');
                $('.js-change-address-list').removeClass('hidden');
            }
        });

        $('body').on('click', '.js-change-address-item', function () {
            var code = $(this).data('code');
            $('.js-change-address-item').attr("data-selected", false);
            $(this).attr("data-selected", true);
            $('.js-change-address-list').attr("data-selected", code);
        });

        $('.js-change-address-confirm').on('click', function () {
            var code = $('.js-change-address-list').attr('data-selected');
            onSelectFunction(code);
        });
        
        $('.js-change-address-cancel').on('click', function () {
            $.colorbox.close();
        });
    },

    parseNumber: function (value, lang) {
        value = value.toString();

        if(lang === 'en') {
            value = value.replace(',','');
        } else if(lang === 'fi_FI' || lang === 'nb_NO' || lang === 'sv_SE') {
            value = value.replace(/\s/g,'');
            value = value.replace(',','.');
        } else if(lang === 'da_DK') {
            value = value.replace('.','');
            value = value.replace(',','.');
        }

        return Number(value);
    },

    isReady: function (name, id, callback, interval, maxCount) {
        var countId = 'countReady' + name + '-' + id;
        if (!ACC.common[countId]) ACC.common[countId] = 0;
        if (ACC.common[countId] === (maxCount || 5)) return;
    
        window.setTimeout(function () {
          if (window[name]) {
            ACC.common[countId] = 0;
            callback(window[name]);
          } else {
            ACC.common[countId]++;
            ACC.common.isReady(name, id, callback, interval, maxCount);
          }
        }, interval || 500);
    },

    sv_SE: {
        closeText: "Stäng",
        prevText: "&#xAB;Förra",
        nextText: "Nästa&#xBB;",
        currentText: "Idag",
        monthNames: ["januari", "februari", "mars", "april", "maj", "juni", "juli", "augusti", "september", "oktober", "november", "december"],
        monthNamesShort: ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"],
        dayNamesShort: ["sön", "mån", "tis", "ons", "tor", "fre", "lör"],
        dayNames: ["söndag", "måndag", "tisdag", "onsdag", "torsdag", "fredag", "lördag"],
        dayNamesMin: ["sö", "må", "ti", "on", "to", "fr", "lö"],
        weekHeader: "Ve",
        dateFormat: "yy-mm-dd",
        firstDay: 1,
        isRTL: !1,
        showMonthAfterYear: !1,
        yearSuffix: ""
    },
    nb_NO: {
        closeText: "Lukk",
        prevText: "&#xAB;Forrige",
        nextText: "Neste&#xBB;",
        currentText: "I dag",
        monthNames: ["januar", "februar", "mars", "april", "mai", "juni", "juli", "august", "september", "oktober", "november", "desember"],
        monthNamesShort: ["jan", "feb", "mar", "apr", "mai", "jun", "jul", "aug", "sep", "okt", "nov", "des"],
        dayNamesShort: ["søn", "man", "tir", "ons", "tor", "fre", "lør"],
        dayNames: ["søndag", "mandag", "tirsdag", "onsdag", "torsdag", "fredag", "lørdag"],
        dayNamesMin: ["sø", "ma", "ti", "on", "to", "fr", "lø"],
        weekHeader: "Uke",
        dateFormat: "dd.mm.yy",
        firstDay: 1,
        isRTL: !1,
        showMonthAfterYear: !1,
        yearSuffix: ""
    },
    da_DK: {
        closeText: "Luk",
        prevText: "&#x3C;Forrige",
        nextText: "Næste&#x3E;",
        currentText: "Idag",
        monthNames: ["Januar", "Februar", "Marts", "April", "Maj", "Juni", "Juli", "August", "September", "Oktober", "November", "December"],
        monthNamesShort: ["Jan", "Feb", "Mar", "Apr", "Maj", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"],
        dayNames: ["Søndag", "Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag"],
        dayNamesShort: ["Søn", "Man", "Tir", "Ons", "Tor", "Fre", "Lør"],
        dayNamesMin: ["Sø", "Ma", "Ti", "On", "To", "Fr", "Lø"],
        weekHeader: "Uge",
        dateFormat: "dd.mm.yy",
        firstDay: 1,
        isRTL: !1,
        showMonthAfterYear: !1,
        yearSuffix: ""
    },
    fi_FI: {
        closeText: "Sulje",
        prevText: "&#xAB;Edellinen",
        nextText: "Seuraava&#xBB;",
        currentText: "Tänään",
        monthNames: ["Tammikuu", "Helmikuu", "Maaliskuu", "Huhtikuu", "Toukokuu", "Kesäkuu", "Heinäkuu", "Elokuu", "Syyskuu", "Lokakuu", "Marraskuu", "Joulukuu"],
        monthNamesShort: ["Tammi", "Helmi", "Maalis", "Huhti", "Touko", "Kesä", "Heinä", "Elo", "Syys", "Loka", "Marras", "Joulu"],
        dayNamesShort: ["Su", "Ma", "Ti", "Ke", "To", "Pe", "La"],
        dayNames: ["Sunnuntai", "Maanantai", "Tiistai", "Keskiviikko", "Torstai", "Perjantai", "Lauantai"],
        dayNamesMin: ["Su", "Ma", "Ti", "Ke", "To", "Pe", "La"],
        weekHeader: "Vk",
        dateFormat: "d.m.yy",
        firstDay: 1,
        isRTL: !1,
        showMonthAfterYear: !1,
        yearSuffix: ""
    },
    en: {
        monthNamesShort: ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "okt", "nov",  "dec"]
    },

    bindCustomAccordion:function(){
        var accordion = $('.js-accordionItem');
        if(accordion) {
            accordion.find('.accordionItem__container').hide();
            accordion.on('click', 'h3', function(){
                var conten = $(this).next('.accordionItem__container')
                $(this).toggleClass('open', conten.is(':not(:visible)')).next().slideToggle(300);
            })
        }
    },

    bindPanel: function(){
        document.addEventListener("click", function (e) {
            // close panel at all
            if ($(".js-panel.open").length) {
              if (!ACC.common.panelProgres) {
                var isInsidePanel = Object.entries(
                  $(e.target).parents()
                ).reduce(function (acc, el) {
                  return (
                    acc ||
                    (el[0] &&
                      !!Number.isInteger(+el[0]) &&
                      (el[1].className.indexOf("js-panel" || "ui-widget") >
                        -1 ||
                        el[1].dataset.panelNav))
                  );
                }, false);
                if (
                  !isInsidePanel &&
                  (e.target.className.indexOf("js-panel") === -1 ||
                  e.target.className.indexOf("js-cfg-cutting") > -1) &&
                  e.target.className.indexOf("ui-datepicker") === -1 &&
                  !e.target.dataset.panelNav
                ) {
                    ACC.cart.quickOrderCloseHandle();
                    $(".js-panel").removeClass("open");
                    ACC.common.hidePanelOverlay();
                }
              } else {
                ACC.common.panelProgres = false;
              }
            }
        });

        $(document).on('click', '[data-panel-nav]', function(e){
            var id = $(this).attr('data-panel-nav');
            ACC.common.handlePanel(id);
        });
    },
    handlePanel: function(id){
        ACC.common.panelProgres = true;
        ACC.cart.quickOrderCloseHandle(id);

        var dataId = '[data-panel-id="' + id + '"]';
        $('.js-panel:not(' + dataId + '):not(.js-panel-keep)').removeClass('open');
        $('body').find('.js-panel' + dataId).toggleClass('open');
        
        if($(dataId).hasClass('open')) {
            if(!$(".panelBox--overlay").length) {
                $('body').append("<div class='panelBox--overlay'></div>");
            }
        } else {
            ACC.common.hidePanelOverlay();
        }
    },

    hidePanelOverlay: function(){
        if(!$(".js-panel-keep.open").length){
            $(".panelBox--overlay").fadeOut(ACC.variables.PANEL_ANIMATION_DURATION, function(){
                $(this).remove();
            })
        }
    },

    bindCustomTooltip: function(){
        if(!$('body').find('.custom-tooltip').length) {
            $('body').append('<div class="custom-tooltip">test</div>');

            $('body').on('mouseover click', '.js-custom-tooltip:visible', function(){
                var apply = $(this).data('customTooltipApplyClass');
                if(!apply || apply && $(this).hasClass(apply)) {
                    var rect = this.getBoundingClientRect();
                    var text = $(this).data('customTooltip');
                    var tooltipContainer = $('.custom-tooltip');
        
                    tooltipContainer.text(text);
                    var he = tooltipContainer.height();
                    tooltipContainer.css({
                        top: rect.top - he,
                        left: rect.left
                    }).addClass('visible');
                }

            })
            $('body').on('mouseout', '.js-custom-tooltip', function(){
                $('.custom-tooltip').removeClass('visible').css({top: 0, left: 0});
            });
        }
    },

    closeSapFormMessage: () => {
        const form = $(".sapCpContentPage");
        const checkForChanges = () => {
            if (!form.hasClass("sapCpContentPageInvalid")) {
                if (form.hasClass("sapCpSubmitCompleted")) {
                  const name = form
                    .parents(".js-sap-form")
                    .data("type")
                    .toLowerCase();
                  ACC.track.trackCloudForms(name);
                } else {
                  setTimeout(checkForChanges, 500);
                }
            }
        }
        form.on("click", ".sapCpButtonWidget", () => {
          if (form.hasClass("sapCpSubmitCompleted")) {
            window.sap.hpa.cei.cntpg.run.reset();

            form.find("input, select, textarea").each(function() {
              $(this).val("").prop("selectedIndex", 0);
            });
            form.removeClass("sapCpSubmitCompleted");
          }
        });

        $(document).find(".sapCpButton").on("click", () => {
            setTimeout(checkForChanges, 500);
        })
    }
};


/* Extend jquery with a postJSON method */
jQuery.extend({
    postJSON: function (url, data, callback) {
        return jQuery.post(url, data, callback, "json");
    }
});

// add a CSRF request token to POST ajax request if its not available
$.ajaxPrefilter(function (options, originalOptions, jqXHR) {
    // Modify options, control originalOptions, store jqXHR, etc
    if (options.type === "post" || options.type === "POST") {
        var noData = (typeof options.data === "undefined");
        if (noData) {
            options.data = "CSRFToken=" + ACC.config.CSRFToken;
        }
        else {
            var patt1 = /application\/json/i;
            if (options.data instanceof window.FormData) {
                options.data.append("CSRFToken", ACC.config.CSRFToken);
            }
            // if its a json post, then append CSRF to the header.
            else if (patt1.test(options.contentType)) {
                jqXHR.setRequestHeader('CSRFToken', ACC.config.CSRFToken);
            }
            else if (options.data.indexOf("CSRFToken") === -1) {
                options.data = options.data + "&" + "CSRFToken=" + ACC.config.CSRFToken;
            }
        }

    }
});

//Polyfill for IE
(function (w) {
    w.URLSearchParams = w.URLSearchParams || function (searchString) {
        var self = this;
        self.searchString = searchString;
        self.get = function (name) {
            var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(self.searchString);
            if (results == null) {
                return null;
            }
            else {
                return decodeURIComponent(results[1]) || 0;
            }
        };
    }

    // https://tc39.github.io/ecma262/#sec-array.prototype.find
    if (!Array.prototype.find) {
        Object.defineProperty(Array.prototype, 'find', {
        value: function(predicate) {
            if (this == null) {
                throw TypeError('"this" is null or not defined');
            }
    
            var o = Object(this);
            var len = o.length >>> 0;
    
            if (typeof predicate !== 'function') {
                throw new TypeError('predicate has to be function');
            }
    
            var thisArg = arguments[1];
            var k = 0;
    
            while (k < len) {
                var kValue = o[k];
                if (predicate.call(thisArg, kValue, k, o)) {
                    return kValue;
                }
                k++;
            }
    
            return undefined;
        },
        configurable: true,
        writable: true
        });
    }
    // https://tc39.github.io/ecma262/#sec-array.prototype.findIndex
    if (!Array.prototype.findIndex) {
        Object.defineProperty(Array.prototype, 'findIndex', {
        value: function(predicate) {
            if (this == null) {
                throw new TypeError('"this" has val null or undefined');
            }
    
            var o = Object(this);
            var len = o.length >>> 0;
    
            if (typeof predicate !== 'function') {
                throw new TypeError('predicate has to be function');
            }
    
            var thisArg = arguments[1];
            var k = 0;
    
            while (k < len) {
                var kValue = o[k];
                if (predicate.call(thisArg, kValue, k, o)) {
                    return k;
                }
                k++;
            }
            return -1;
        }
        });
    }
    if (!Array.prototype.filter) {
        Array.prototype.filter = function(fun /*, thisp*/) {
            var len = this.length;
            if (typeof fun != "function")
            throw new TypeError();

            var res = new Array();
            var thisp = arguments[1];
            for (var i = 0; i < len; i++) {
                if (i in this) {
                    var val = this[i]; // in case fun mutates this
                    if (fun.call(thisp, val, i, this))
                    res.push(val);
                }
            }
            return res;
        };
    }

    if (!String.prototype.replaceAll) {
        String.prototype.replaceAll = function(search, replacement) {
            var target = this;
            return target.replace(new RegExp(search, 'g'), replacement);
        };
    };
    
    if (!String.prototype.includes) {
        String.prototype.includes = function(search, start) {
            'use strict';
        
            if (search instanceof RegExp) {
                throw TypeError('first argument must not be a RegExp');
            }
            if (start === undefined) { start = 0; }
            return this.indexOf(search, start) !== -1;
        };
    }

    // Production steps of ECMA-262, Edition 5, 15.4.4.21
    // Reference: http://es5.github.io/#x15.4.4.21
    if (!Array.prototype.reduce) {
        Array.prototype.reduce = function(callback /*, initialValue*/) {
        'use strict';
        if (this == null) {
            throw new TypeError('Array.prototype.reduce called on null or undefined');
        }
        if (typeof callback !== 'function') {
            throw new TypeError(callback + ' is not a function');
        }
        var t = Object(this), len = t.length >>> 0, k = 0, value;
        if (arguments.length == 2) {
            value = arguments[1];
        } else {
            while (k < len && !(k in t)) {
            k++;
            }
            if (k >= len) {
            throw new TypeError('Reduce of empty array with no initial value');
            }
            value = t[k++];
        }
        for (; k < len; k++) {
            if (k in t) {
            value = callback(value, t[k], k, t);
            }
        }
        return value;
        };
    }

    if (!Object.keys) Object.keys = function(o) {
        if (o !== Object(o))
            throw new TypeError('Object.keys called on a non-object');
        var k=[],p;
        for (p in o) if (Object.prototype.hasOwnProperty.call(o,p)) k.push(p);
        return k;
    }


    if (!Object.entries) {
        Object.entries = function( obj ){
          var ownProps = Object.keys( obj ),
              i = ownProps.length,
              resArray = new Array(i); // preallocate the Array
          while (i--)
            resArray[i] = [ownProps[i], obj[ownProps[i]]];
      
          return resArray;
        };
      }
    
})(window)