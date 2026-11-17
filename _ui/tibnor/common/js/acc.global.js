ACC.global = {

    _autoload: [
        ["passwordStrength", $('.password-strength').length > 0],
        "bindToggleOffcanvas",
        "bindToggleUserMenu",
        "bindHoverIntentMainNavigation",
        "initImager",
        "backToHome",
        "bindDropdown",
        "closeAccAlert",
        "bindGlobal"
    ],

    bindGlobal: function() {
        $(window).on('resize', function(){
            ACC.global.resetUserMenu();
            ACC.global.resetXsSearch();
            ACC.global.resetXsOffcanvas();
        });
    },

    passwordStrength: function () {
        $('.password-strength').pstrength({
            verdicts: [ACC.pwdStrengthTooShortPwd,
                ACC.pwdStrengthVeryWeak,
                ACC.pwdStrengthWeak,
                ACC.pwdStrengthMedium,
                ACC.pwdStrengthStrong,
                ACC.pwdStrengthVeryStrong],
            minCharText: ACC.pwdStrengthMinCharText
        });
    },

    bindToggleOffcanvas: function () {
        $(document).on("click", ".js-toggle-sm-navigation, .js-nav-bg-sm", function () {
            ACC.global.toggleClassState($(".js-toggle-sm-navigation"), "active");
            ACC.global.toggleClassState($(".js_navigation--bottom"), "offcanvas");
            ACC.global.toggleClassState($("html"), "offcanvas");
            ACC.global.toggleClassState($("body"), "offcanvas");
            $(".js-nav-bg-sm").toggle();
            ACC.global.resetXsSearch();
            ACC.global.resetUserMenu();
        });
    },

    bindToggleUserMenu: function () {
        
        $(document).on("click", ".js-toggle-user", function (e) {
            e.preventDefault();
            const width = window.innerWidth;
            ACC.global.toggleClassState($(".js-toggle-user"), "active");
            ACC.global.resetXsSearch();
            ACC.global.resetXsOffcanvas();

            const left = $(this).offset().left;
            const leftCalc = left < 150 ? 0: left - 150;
            $('.js-user-subnav').toggle().css({
                left: width < 1023 ? leftCalc : 'auto',
            });
        });
    },

    resetXsSearch: function () {
        $('.site-search').removeClass('active');
        $(".js-mainHeader .navigation--middle").removeClass("search-open");
    },

    resetXsOffcanvas: function () {
        $(".js_navigation--bottom, html, body").removeClass("offcanvas");
        $(".js-toggle-sm-navigation").removeClass("active");
        $(".js-nav-bg-sm").hide();
    },

    resetUserMenu: function () {
        $(".js-toggle-user").removeClass("active");
        $('.js-user-subnav').hide();
    },

    toggleClassState: function ($e, c) {
        $e.hasClass(c) ? $e.removeClass(c) : $e.addClass(c);
        return $e.hasClass(c);
    },

    bindHoverIntentMainNavigation: function () {

        enquire.register("screen and (min-width:" + ACC.common.encodeHtml(screenMdMin) + ")", {

            match: function () {
                // on screens larger or equal screenMdMin (1024px) calculate position for .sub-navigation
                $(".js-enquire-has-sub").hoverIntent(function () {
                    var $this = $(this),
                        itemWidth = $this.width();
                    var $subNav = $this.find('.js_sub__navigation'),
                        subNavWidth = $subNav.outerWidth();
                    var $mainNav = $('.js_navigation--bottom'),
                        mainNavWidth = $mainNav.width();


                    // get the left position for sub-navigation to be centered under each <li>
                    var leftPos = $this.position().left + itemWidth / 2 - subNavWidth / 2;
                    // get the top position for sub-navigation. this is usually the height of the <li> unless there is more than one row of <li>
                    var topPos = $this.position().top + $this.height();
                    if (leftPos > 0 && leftPos + subNavWidth < mainNavWidth) {
                        // .sub-navigation is within bounds of the .main-navigation
                        $subNav.css({
                            "left": leftPos,
                            "top": topPos,
                            "right": "auto"
                        });
                    } else if (leftPos < 0) {
                        // .suv-navigation can't be centered under the <li> because it would exceed the .main-navigation on the left side
                        $subNav.css({
                            "left": 0,
                            "top": topPos,
                            "right": "auto"
                        });
                    } else if (leftPos + subNavWidth > mainNavWidth) {
                        // .suv-navigation can't be centered under the <li> because it would exceed the .main-navigation on the right side
                        $subNav.css({
                            "right": 0,
                            "top": topPos,
                            "left": "auto"
                        });
                    }
                    $this.addClass("show-sub");
                }, function () {
                    $(this).removeClass("show-sub")
                });
            },

            unmatch: function () {
                // on screens smaller than screenMdMin (1024px) remove inline styles from .sub-navigation and remove hoverIntent
                $(".js_sub__navigation").removeAttr("style");
                $(".js-enquire-has-sub").hoverIntent(function () {
                    // unbinding hover
                });
            }

        });
    },

    initImager: function (elems) {
        elems = elems || '.js-responsive-image';
        this.imgr = new Imager(elems);
    },

    reprocessImages: function (elems) {
        elems = elems || '.js-responsive-image';
        if (!this.imgr) {
            this.initImager(elems);
        } else {
            this.imgr.checkImagesNeedReplacing($(elems));
        }
    },

    // usage: ACC.global.addGoogleMapsApi("callback function"); // callback function name like "ACC.global.myfunction"
    addGoogleMapsApi: function (callback) {
        if (callback && $(".js-googleMapsApi").length === 0) {
            var googleApiSrc = "//maps.googleapis.com/maps/api/js?key=" + ACC.common.encodeHtml(ACC.config.googleApiKey) + '&sensor=false&callback=' + ACC.common.encodeHtml(callback);
            $('head').append($("<script>").addClass("js-googleMapsApi")
                .attr("type", "text/javascript")
                .attr("src", googleApiSrc));
        } else if (callback) {
            eval(callback + "()"); //NOSONAR
        }
    },

    backToHome: function () {
        $(".backToHome").on("click", function () {
            window.location = ACC.config.contextPath;
        });
    },

    bindDropdown: function () {
        $(document).on("click", ".dropdown-toggle", dropdownToggle);
    },

    closeAccAlert: function () {
        $(".closeAccAlert").on("click", function () {
            $(this).parent('.getAccAlert').remove();
        });
    },

    getSvgStockInfo: function (type, color) {
        //type: excl | tick
        var viewBox = type === "excl" ? "0 54 18 18" : "0 18 18 18";
        return (
          '<svg viewBox="' +
          viewBox +
          '" class="square-ico square-ico--' +
          color +
          '"><use xlink:href="#' +
          type +
          '"></use></svg>'
        );
      },

};

// ***** Dropdown begins *****
function dropdownParent($this) {
    var selector = $this.attr('href');
    selector = selector && /#[A-Za-z]/.test(selector) && selector.replace(/.*(?=#[^\s]*$)/, ''); // strip for ie7

    var $parent = selector && $(selector);

    return $parent && $parent.length ? $parent : $this.parent()
}

function dropdownClearMenus(e) {
    // if right click, exit
    if (e && e.which === 3) {
        return;
    }

    // remove class added on dropdownToggle
    $('.dropdown-backdrop').remove();

    $(".dropdown-toggle").each(function () {
        var $parent = dropdownParent($(this));

        if (!$parent.hasClass('open')) {
            return;
        }

        if (e && e.type === 'click' && /input|textarea/i.test(e.target.tagName) && $.contains($parent[0], e.target)) {
            return;
        }

        $parent.removeClass('open')
    })
}

function dropdownToggle(e) {
    var $this = $(this);

    if ($this.is('.disabled, :disabled')) return

    var $parent = dropdownParent($this);
    var isActive = $parent.hasClass('open');

    dropdownClearMenus();

    if (!isActive) {
        if ('ontouchstart' in document.documentElement && !$parent.closest('.navbar-nav').length) {
            // if mobile we use a backdrop because click events don't delegate
            $(document.createElement('div'))
                .addClass('dropdown-backdrop')
                .insertAfter($(this))
                .on('click', dropdownClearMenus)
        }

        if (e.isDefaultPrevented()) {
            return;
        }

        // expand the <ul> on the dropdown
        $this
            .trigger('focus')
            .attr('aria-expanded', 'true');

        // set parent to open
        $parent.toggleClass('open')
    }

    return false;
}
//***** Dropdown ends *****

function getUrlParams() {
    var vars = {};
    var href = window.location.href;
    href.replace(/[?&]+([^=&]+)=([^&]*)/gi,function(m,key,value) {
        vars[key] = value;
    });
    return vars;
}
