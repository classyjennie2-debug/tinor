ACC.tabs = {

    _autoload: [
        ["bindTabs", $(".js-tabs").length > 0],
        "hideReviewBtn",
        "determineToDisplayReviews"
    ],

    tabConf: {
        tabhead: '.tabhead',
        tabbody: '.tabbody',
        fx: 'fadeIn',
        fxspeed: 0,
        currentClass: 'active',
        autoAnchor: true,
        lastNavItemClass: 'last js-last-nav-tab',
        syncheights:true
    },

    bindTabs: function () {
        $e = $(".js-tabs");
        tabs = $e.accessibleTabs(ACC.tabs.tabConf);

        //smarteditloader hack
        if(('#ySmartEditFrame').length){
            $(document).on("scroll", function (e) {
                var tabsSE = $("body").find(".js-tabs");
                if(tabsSE.find("> div.yCmsComponent").length){
                    tabsSE.accessibleTabs(ACC.tabs.tabConf);
                }
            });
        }

        $e.on("click", ".tabhead", function (e) {
            e.preventDefault();

            if ($(this).hasClass("active")) {
                $(this).removeClass("active");
            } else {
                $(this).parents(".js-tabs").children(".tabs-list").find("a[href='" + "#" + $(this).attr("id") + "']").click();

                var offset = $(this).offset().top;
                $("body,html").scrollTop(offset);
            }

        });

        $e.on("click", "#tabreview", function (e) {
            e.preventDefault();
            ACC.track.trackShowReviewClick();
            ACC.tabs.showReviewsAction("reviews");
        });

        $e.on("click", ".all-reviews-btn", function (e) {
            e.preventDefault();
            ACC.tabs.showReviewsAction("allreviews");
            ACC.tabs.hideReviewBtn(".all-reviews-btn");
            ACC.tabs.showReviewBtn(".less-reviews-btn");
        });

        $e.on("click", ".less-reviews-btn", function (e) {
            e.preventDefault();
            ACC.tabs.showReviewsAction("reviews");
            ACC.tabs.hideReviewBtn(".less-reviews-btn");
            ACC.tabs.showReviewBtn(".all-reviews-btn");
        });

        $(document).on("click", '.js-writeReviewTab', function (e) {
            e.preventDefault();
            tabs.showAccessibleTabSelector($(this).attr("href"));
            $(".js-review-write").show();
            $('#reviewForm input[name=headline]').focus();
        });

        $(document).on("click", ".js-review-write-toggle", function (e) {
            e.preventDefault();
            if ($(".js-review-write:visible").length < 1) {
                $(".js-review-write").show();

            } else {
                $(".js-review-write").hide();
            }
        });

        $(document).on("click", ".js-openTab", function () {
            tabs.showAccessibleTabSelector($(this).attr("href"));
        });
        
        handleArrows = function(){
            var lastItem = $e.find('.js-last-nav-tab');
            if(lastItem.length){
                var lastPos = lastItem.offset().left;
                var lastWidth = lastItem.width();
                var tabPos = $e.offset().left;
                var tabWidth = $e.width();
            
                $e.parent().toggleClass( "tabs-arrow", lastPos + lastWidth > tabPos + tabWidth);
            }
        }

        $(window).on('load', handleArrows);
        $(window).on('resize', handleArrows);
        
        $(document).on("click", ".js-tib-tabs-btn", function () {
            var targ = $(this).data('nav');
            var targVal = targ === 'prev' ? -1 : +1;
            $e.find('.tabs-list').animate({scrollLeft: $e.find('.tabs-list').scrollLeft() + (targVal * $e.width()/4)}, 800);
        });

    },

    showReviewsAction: function (s) {
        $.get($("#reviews").data(s), undefined, function (result) {
            $('#reviews').html(ACC.sanitizer.sanitize(result));
            if ($(".js-ratingCalc").length > 0) {
                ACC.ratingstars.bindRatingStars();
                ACC.tabs.showingAllReviews();
            }
        }, 'html');
    },

    hideReviewBtn: function (btnClass) {

        btnClass = (btnClass === undefined) ? ".less-reviews-btn" : btnClass;
        $(btnClass).hide();
    },

    showReviewBtn: function (btnClass) {
        $(btnClass).show();
    },

    showingAllReviews: function () {
        var isShowingAllReviews = $("#showingAllReviews").data("showingallreviews");
        if (isShowingAllReviews) {
            ACC.tabs.hideReviewBtn(".all-reviews-btn");
        }
    },

    determineToDisplayReviews: function () {
        if (location.hash === "#tabreview") {
            ACC.tabs.showReviewsAction('reviews');
        }
    }
};
