ACC.imagegallery = {

    _autoload: [
        "bindImageGallery"
    ],

    hybrisImageDataToGalleryImages: function(images) {
        return images.filter(image => image.galleryIndex !== null)
            .reduce((accumulator, image) => {
                if (!accumulator[image.galleryIndex]) {
                    // init the object if it doesn't exist
                    accumulator[image.galleryIndex] = {
                        galleryIndex: image.galleryIndex,
                        altText: image.altText
                    };
                }
                accumulator[image.galleryIndex][image.format] = image.url;
                return accumulator;
            }, []);
    },

    updateGallery: function(images) {
        if (images) {
            let galleryImages = this.hybrisImageDataToGalleryImages(images);
            let template = Handlebars.compile($('#galleryTemplate').html());
            let galleryImagesHtml = template({images: galleryImages, count: galleryImages.length});
            $(".js-gallery").html(galleryImagesHtml);
            ACC.imagegallery.bindImageGallery();
        }
    },

    bindImageGallery: function () {

        $(".js-gallery").each(function () {

            let $image = $(this).find(".js-gallery-image");
            let $carousel = $(this).find(".js-gallery-carousel");

            $image.owlCarousel({
                singleItem: true,
                pagination: true,
                navigation: true,
                lazyLoad: true,
                navigationText: [$("<span>").addClass("glyphicon glyphicon-chevron-left"), $("<span>").addClass("glyphicon glyphicon-chevron-right")],
                afterAction: function () {
                    ACC.imagegallery.syncPosition($image, $carousel, this.currentItem);
                },
                startDragging: function () {
                },
                afterLazyLoad: function (e) {

                    let b = $image.data("owlCarousel") || {};
                    if (!b.currentItem) {
                        b.currentItem = 0;
                    }

                    $('.js-m-popup').magnificPopup({
                        type: 'image',
                        gallery: {
                            enabled: true
                        }
                    });
                }
            });


            $carousel.owlCarousel({
                navigation: true,
                navigationText: [$("<span>").addClass("glyphicon glyphicon-chevron-left"), $("<span>").addClass("glyphicon glyphicon-chevron-right")],
                pagination: false,
                items: 2,
                itemsDesktop: [5000, 3],
                itemsDesktopSmall: [1200, 3],
                itemsTablet: [768, 3],
                itemsMobile: [480, 3],
                lazyLoad: true,
                afterAction: function () {

                }
            });


            $carousel.on("click", "a.item", function (e) {
                e.preventDefault();
                $image.trigger("owl.goTo", $(this).parent(".owl-item").data("owlItem"));
            });
        });
    },


    syncPosition: function ($image, $carousel, currentItem) {
        $carousel.trigger("owl.goTo", currentItem);
    }
};