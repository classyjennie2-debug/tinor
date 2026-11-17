/*
 * Tibnor AB B2B Commerce Solution
 *
 * Copyright (c) 2018-2019. All rights reserved.
 *
 * This software is the confidential and proprietary information of Tibnor AB.
 */

var oDoc = document;

ACC.navigation = {

    _autoload: [
        "offcanvasNavigation",
        "myAccountNavigation",
        "userNavigation",
        "orderToolsNavigation",
        "dynamicNavigation",
        "stickyHeader"
    ],

    offcanvasNavigation: function () {

        enquire.register("screen and (max-width:" + ACC.common.encodeHtml(screenSmMax) + ")", {

            match: function () {

                $(document).on("click", ".js-enquire-offcanvas-navigation .js-enquire-has-sub .js_nav__link--drill__down", function (e) {
                    e.preventDefault();
                    $(".js-enquire-offcanvas-navigation ul.js-offcanvas-links").addClass("active");
                    $(".js-enquire-offcanvas-navigation .js-enquire-has-sub").removeClass("active");
                    $(this).parent(".js-enquire-has-sub").addClass("active");
                });


                $(document).on("click", ".js-enquire-offcanvas-navigation .js-enquire-sub-close", function (e) {
                    e.preventDefault();
                    $(".js-enquire-offcanvas-navigation ul.js-offcanvas-links").removeClass("active");
                    $(".js-enquire-offcanvas-navigation .js-enquire-has-sub").removeClass("active");
                });

            },

            unmatch: function () {

                $(".js-enquire-offcanvas-navigation ul.js-offcanvas-links").removeClass("active");
                $(".js-enquire-offcanvas-navigation .js-enquire-has-sub").removeClass("active");

                $(document).off("click", ".js-enquire-offcanvas-navigation .js-enquire-has-sub > a");
                $(document).off("click", ".js-enquire-offcanvas-navigation .js-enquire-sub-close");
            }
        });
    },

    handleSessionError: function (data, status) {
        if(data.status === status) {
            ACC.navigation.customerCall(true);
        }
    },

    customerCall: function (message) {
        const requestUrl = ACC.config.encodedContextPath + '/rest/customer';

        $.ajax({
            type: "GET",
            url: requestUrl,
            success: function (data) {
                if (data.name) {
                    ACC.track.trackLoggedUser(data.contactNumber);
                    
                    $(".js-user-name").text(data.name);
                    $(".js-user-logged").removeClass("hidden");

                    if(!ACC.userLogged) {
                        ACC.userLogged = true;
                        ACC.minicart.updateMiniCartDisplay();
                    }

                    ACC.configurator.updateShowPrice();
                    ACC.giosg.visitors(data);
                }

                if (message && !data) {
                    $.colorbox({
                        title: `<b>${ACC.messages.sessionTimeOutPopupTitle}</b>`,
                        html: `<p style="padding-left:10px;">${ACC.messages.sessionTimeOutPopupBody}</p>`,
                        opacity: 0.7,
                        width: "500px",
                        maxWidth: "100%",
                        maxHeight: "100%",
                        close: "",
                        onComplete: function () {
                            $("body").removeClass("login");
                            sessionStorage.removeItem('priceLists');
                            setTimeout(() => {
                                $.colorbox.close();
                            }, 5000);
                        },
                        onClosed: function () {
                            location.reload();
                        },
                    });
                }
            },
        });
    },

    userNavigation: function () {
        const loginForm = $('#logInPanelBox');

        ACC.navigation.customerCall();

        loginForm.on('submit', e => {
            e.preventDefault();

            const dataFromForm = JSON.stringify(
              loginForm.serializeArray().reduce(
                (acc, { name, value }) => ({
                  ...acc,
                  [name]: value,
                }),
                {}
              )
            );

            const $formSubmitBtn = loginForm.find('button[type="submit"]');
            const loaderScope = loginForm.parents(".js-panel");
            ACC.forms.startLoader(loaderScope, $formSubmitBtn);
            loginForm.find('.has-error').hide();

          $.ajax({
            type: "POST",
            url: ACC.config.encodedContextPath + "/rest/login",
            data: dataFromForm,
            contentType: 'application/json',
            success: (data) => {
              const { user } = data;
              if (user) {
                  sessionStorage.removeItem('priceLists');
                  window.location.reload();
              }
            },
            error: () => {
                loginForm.find('.has-error').slideDown()
                ACC.forms.stopLoader(loaderScope, $formSubmitBtn);
            }
          });
        })

        $('.js-logout').on('click', () => {
            sessionStorage.removeItem('priceLists');
        })
    },

    myAccountNavigation: function () {
        //Add the order form img in the navigation
        $('.nav-form').append($("<span>").addClass("glyphicon glyphicon-list-alt"));


        var aAcctData = [];
        var sSignBtn = "";
        var i;

        //my account items
        var oMyAccountData = $(".accNavComponent");

        //the my Account hook for the desktop
        var oMMainNavDesktop = $(".js-secondaryNavAccount > ul");


        if (oMyAccountData) {
            var aLinks = oMyAccountData.find("a");
            for (i = 0; i < aLinks.length; i++) {
                aAcctData.push({link: aLinks[i].href, text: aLinks[i].title});
            }
        }

        //create Welcome User + expand/collapse and close button
        //This is for mobile navigation. Adding html and classes.
        var oUserInfo = $(".nav__right ul li.logged_in");
        //Check to see if user is logged in
        if (oUserInfo && oUserInfo.length === 1) {
            var sUserBtn = $("<li>").addClass("auto")
                .append($("<div>")
                    .addClass("userGroup")
                    .append($("<span>")
                        .addClass("glyphicon glyphicon-user myAcctUserIcon"))
                    .append($("<div>")
                        .addClass("userName")
                        .html(oUserInfo[0].innerHTML)));

            if (aAcctData.length > 0) {
                $(sUserBtn).find(".userGroup").append($("<a>").addClass("collapsed js-nav-collapse")
                    .attr("id", "signedInUserOptionsToggle")
                    .attr("data-toggle", "collapse")
                    .attr("data-target", ".offcanvasGroup1")
                    .append($("<span>").addClass("glyphicon glyphicon-chevron-up myAcctExp")));
            }

            $('.js-userAccount-Links').append(sSignBtn);
            $('.js-userAccount-Links').append($("<li>").addClass("auto").append($("<div>").addClass("myAccountLinksContainer js-myAccountLinksContainer")));


            //FOR DESKTOP
            var myAccountHook = $("<div>").addClass("myAccountLinksHeader js-myAccount-toggle")
                .attr("data-toggle", "collapse")
                .attr("data-parent", ".nav__right")
                .text(oMyAccountData.data("title"));

            myAccountHook.insertBefore(oMyAccountData);

            //*For toggling collapse myAccount on Desktop instead of with Bootstrap.js
            $('.myAccountLinksHeader').click(function () {
                $(this).toggleClass('show');
                $(".js-secondaryNavAccount").slideToggle(400);
                if ($(this).hasClass('show')) {
                    $('.myCompanyLinksHeader').removeClass('show'); // hide the other one
                    $('.js-secondaryNavCompany').slideUp(400);
                }
                return false;
            });

            //FOR MOBILE
            //create a My Account Top link for desktop - in case more components come then more parameters need to be passed from the backend
            var myAccountHook = $("<div>").addClass("sub-nav")
                .append($("<a>").attr("id", "signedInUserAccountToggle")
                    .addClass("myAccountLinksHeader collapsed js-myAccount-toggle")
                    .attr("data-toggle", "collapse")
                    .attr("data-target", ".offcanvasGroup2")
                    .text(oMyAccountData.data("title"))
                    .append($("<span>").addClass("glyphicon glyphicon-chevron-down myAcctExp")));

            $('.js-myAccountLinksContainer').append(myAccountHook);

            //add UL element for nested collapsing list
            $('.js-myAccountLinksContainer').append($("<ul>")
                .attr("data-trigger", "#signedInUserAccountToggle")
                .addClass("offcanvasGroup2 offcanvasNoBorder collapse js-nav-collapse-body subNavList js-myAccount-root sub-nav"));

            //*For toggling collapse on Mobile instead of with Bootstrap.js
            $('#signedInUserAccountToggle').click(function () {
                $(this).toggleClass('show');
                $(".offcanvasGroup2").slideToggle(400);
                if ($(this).hasClass('show')) {
                    $(this).find('span').removeClass('glyphicon-chevron-down').addClass('glyphicon-chevron-up');
                    $('#signedInCompanyToggle').removeClass('show'); // hide the other one
                    $('#signedInCompanyToggle').find('span').removeClass('glyphicon-chevron-up').addClass('glyphicon-chevron-down');
                    $('.offcanvasGroup3').slideUp(400);
                }
                else {
                    $(this).find('span').removeClass('glyphicon-chevron-up').addClass('glyphicon-chevron-down');
                }
            });

            //offcanvas items
            for (i = aAcctData.length - 1; i >= 0; i--) {
                var oLink = oDoc.createElement("a");
                oLink.title = aAcctData[i].text;
                oLink.href = aAcctData[i].link;
                oLink.innerHTML = ACC.common.encodeHtml(aAcctData[i].text);

                var oListItem = oDoc.createElement("li");
                oListItem.appendChild(oLink);
                oListItem = $(oListItem);
                oListItem.addClass("auto ");
                $('.js-myAccount-root').append(oListItem);
            }

        }

        //desktop
        for (i = 0; i < aAcctData.length; i++) {
            var oLink = oDoc.createElement("a");
            oLink.title = aAcctData[i].text;
            oLink.href = aAcctData[i].link;
            oLink.innerHTML = ACC.common.encodeHtml(aAcctData[i].text);

            var oListItem = oDoc.createElement("li");
            oListItem.appendChild(oLink);
            oListItem = $(oListItem);
            oListItem.addClass("auto col-md-4");
            oMMainNavDesktop.get(0).appendChild(oListItem.get(0));
        }

        //hide and show content areas for desktop
        $('.js-secondaryNavAccount').on('shown.bs.collapse', function () {

            if ($('.js-secondaryNavCompany').hasClass('in')) {
                $('.js-myCompany-toggle').click();
            }

        });

        $('.js-secondaryNavCompany').on('shown.bs.collapse', function () {

            if ($('.js-secondaryNavAccount').hasClass('in')) {
                $('.js-myAccount-toggle').click();
            }

        });

        //change icons for up and down
        $('.js-nav-collapse-body').on('hidden.bs.collapse', function (e) {

            var target = $(e.target);
            var targetSpanSelector = target.attr('data-trigger') + ' > span';
            if (target.hasClass('in')) {
                $(document).find(targetSpanSelector).removeClass('glyphicon-chevron-down').addClass('glyphicon-chevron-up');
            }
            else {
                $(document).find(targetSpanSelector).removeClass('glyphicon-chevron-up').addClass('glyphicon-chevron-down');
            }
        });

        $('.js-nav-collapse-body').on('show.bs.collapse', function (e) {
            var target = $(e.target);
            var targetSpanSelector = target.attr('data-trigger') + ' > span';
            if (target.hasClass('in')) {
                $(document).find(targetSpanSelector).removeClass('glyphicon-chevron-up').addClass('glyphicon-chevron-down');
            }
            else {
                $(document).find(targetSpanSelector).removeClass('glyphicon-chevron-down').addClass('glyphicon-chevron-up');
            }
        });

    },

    orderToolsNavigation: function () {
        $('.js-nav-order-tools').on('click', function () {
            $(this).toggleClass('js-nav-order-tools--active');
        });
    },

    closeNavigation: function () {
        $('.js-nav-level-2').addClass('hidden');
        $('.js-link-contentPage, .js-link-top').removeClass('current');
        ACC.global.resetUserMenu();
    },

    dynamicNavigation: function () {
        let loadedCategories = {
            all: [],
            sub: []
        };
        const isDesktop = window.innerWidth > 1023;

        $('.js-header').on('mouseleave', function () {
            ACC.navigation.closeNavigation()
        });

        // open level 1 for NOT category item
        $('.js-link-contentPage').on('click', '.js-link', function (e) {
            const parent = $(this).parent();
            openLevel1(e, parent);
        });
        
        // open level 1 for category item
        $('.js-link-top').on('click', '.js-link', function (e) {
            const parent = $(this).parent();

            if (
              !parent.hasClass("js-customerproducts") &&
              (isDesktop || (!parent.hasClass("current") && !isDesktop))
            ) {
              if (!isDesktop) {
                $(".js-last-level-item").addClass("hidden");
                $(this).find(".js-see-all").removeClass("hidden");
              }

              openLevel1(e, parent);

              const subCats = parent.find(".js-sub-categories");
              subCats.empty();
              const categoryCode = $(this).data("code");
              var categories = window.categories || [];
              var category = categories.find(c => String(c.code) === String(categoryCode));
              renderSubcategories(subCats, category);
            }
        });
        
        if (!isDesktop) {
            // Level 2 for category item
            $('.js-link-top').on('click', '.js-nav-show-last-level', function (e) {
                const parent  = $(this).parent();

                if(!parent.hasClass('current')) {
                    e.preventDefault();
                    parent.addClass('current').find('.js-last-level-item').removeClass('hidden');
                    parent.siblings().addClass('hidden');
        
                    $('.js-link').addClass('hidden');
                    $('.js-nav-back').addClass('lastLevel');
                    $(this).find('.js-see-all').removeClass('hidden');
                }
            });

            // BACK btn
            $('.js-nav-back').on('click', function () {
                if($(this).hasClass('lastLevel')) {
                    const navs = $(this).siblings();
                    
                    navs.find('.js-last-links').removeClass('hidden current');
                    navs.find('.js-last-level-item').addClass('hidden');
                    
                    $(this).removeClass('lastLevel');
                    $('.js-nav-show-last-level .js-see-all').addClass('hidden');
                } else {
                    $('\
                        .js-link-top, \
                        .js-link-special, \
                        .js-link-contentPage, \
                        .js-last-level-item').removeClass('hidden current');

                    $('.js-nav-level-2, .js-nav-back').addClass('hidden');
                    $('.js-see-all').addClass('hidden');
                }

                $('.js-link').removeClass('hidden');
            });
        }

        function openLevel1(e, parent) {
            var href = e.currentTarget && $(e.currentTarget).attr("href");
            if (!href || href === "#") {
                e.preventDefault();
            }
            ACC.navigation.closeNavigation();
            parent.addClass('current');

            $('.js-nav-level-2').addClass('hidden');
            parent.find('.js-nav-level-2').removeClass('hidden');

            if (!isDesktop) {
                $('.js-nav-back').removeClass('hidden');
                $('\
                    .js-link-top, \
                    .js-link-special, \
                    .js-link-contentPage').addClass('hidden');
                parent.removeClass('hidden');
            }  
        }

        function renderSubcategories(subCats, category) {
            let { all, sub } = loadedCategories
            sub  = [];
            if (category) {
                all.push(category.code);
                category.subCategories.forEach(function (link) {
                    let d = link.subCategories
                    if (Array.isArray(d) && d.length > 0) {
                        sub.push([link, d]);
                        if (sub.length === category.subCategories.length) {
                            sub.sort((a, b) => {
                                const nA = a[0].name;
                                const nB = b[0].name;
                                return nA > nB ? 1 : nB > nA ? -1 : 0;
                            });

                            if (sub.length > 0) {
                                sub.forEach(([linkMain, sC]) => {
                                    const lastLevelItem = `class="js-last-level-item ${!isDesktop ? 'hidden' : ''}"`;
                                    let navs = `<ul class="last-nav__links js-last-links" id="link${linkMain.code}">
                                                <li class="js-nav-show-last-level">
                                                    <a class="nav-see_all" title="${linkMain.name}" href="${linkMain.url}">
                                                        <span class="js-see-all hidden">${ACC.text.seeAll}</span>
                                                        ${linkMain.name} <span class="hidden-xs hidden-sm">&#8594;</span>
                                                    </a>
                                                </li>`;
                                    sC.forEach(function (l) {
                                        navs += `<li ${lastLevelItem}><a href="${ACC.config.encodedContextPath}${l.url}">${l.name}</a></li>`;
                                    });
                                    navs += '</ul>';

                                    $(navs).appendTo(subCats);
                                })
                            }
                        }
                    }
                });
            }
        }
    },

    stickyHeader: function () {
        var scroll;
        var scrollTop = 0;

        $(window).scroll(function () {
            scroll = !$('.js-nav').hasClass('offcanvas');
        });

        setInterval(function () {
            if (scroll) {
                checkScroll();
                scroll = false;
            }
        }, 500);

        function checkScroll() {
            var currentScrollTop = $(this).scrollTop();

            if (Math.abs(scrollTop - currentScrollTop) >= 1) {
                if (($('.page-productDetails').length || currentScrollTop > scrollTop) && currentScrollTop > 200) {
                    $('.js-mainHeader').addClass('invisible');
                    ACC.global.resetUserMenu();
                } else {
                    $('.js-mainHeader').removeClass('invisible');
                }
                scrollTop = currentScrollTop;
            }
        }
    }
};
