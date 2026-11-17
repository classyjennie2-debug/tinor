ACC.forms = {
  _autoload: [["bindHandleInputsForm", $(".js-form-style").length !== 0]],

  bindHandleInputsForm: function () {
    $(".js-form-style")
      .find("input")
      .on("keyup", function (e) {
        var val = $(this).val();
        var parent = $(this).parent();
        if (val) parent.addClass("hasVal");
        else parent.removeClass("hasVal");
      })
      .on("keypress keyup", function (e) {
        var val = $(this).val();
        var maxlength = $(this).attr("maxlength") * 1;
        var patternAttr = $(this).attr("pattern");

        if (val.length === maxlength) e.preventDefault();
        if (patternAttr) {
          var pattern = new RegExp(patternAttr, "g");
          val = val.replace(pattern, "");
          $(this).val(val);
        }
        if (maxlength) $(this).val(val.toString().substr(0, maxlength));
      });
  },

  completeAjaxForm: function (xht, popup, popupClassName, form) {
    var ifSuccess = xht.status === 200;
    if (ifSuccess) {
      ACC.colorbox.open("", {
        html: popup,
        width: "500px",
        reposition: false,
        closeButton: false,
        onComplete: function () {
          $(this).colorbox.resize();
        },
        className: popupClassName,
      });
    }
    $(".js-error-info").toggleClass("hidden", ifSuccess);
    form.toggleClass('submited', !ifSuccess)
  },

  errorAjaxForm: function (xht, form) {
    if (xht.status === 400 && xht.responseJSON && xht.responseJSON.errors) {
      const errs = xht.responseJSON.errors;
      errs.forEach(function (el) {
        var item = form.find('input[name="' + el.field + '"], textarea[name="' + el.field + '"], select[name="' + el.field + '"]');
        item
          .after(
            '<div class="help-block">' + (el.message || el.code) + "</div>"
          )
          .parent()
          .addClass("has-error", !el.code);
      });
      $(".js-error-no").text(errs.length);
      if (errs.length === 1) {
        const pos = $(".has-error").offset().top - 150;
        window.scrollTo(0, pos);
      }
    }
  },

  successAjaxForm: function (formId) {
    document.getElementById(formId).reset();
    $(".hasVal").removeClass("hasVal");
  },

  clearForm: function (form) {
    form
      .find(".form-group")
      .removeClass("has-error")
      .find(".help-block")
      .remove();
  },

  newAjaxForm: function (form, formId, popup, successPopupClass, calbackError) {
    form.ajaxForm({
      success: function () {
        ACC.recaptcha.clearForm(form);
        ACC.forms.successAjaxForm(formId);
      },
      error: function (xht) {
        ACC.recaptcha.clearForm(form);
        ACC.forms.errorAjaxForm(xht, form);
        calbackError();
      },
      complete: function (xht) {
        ACC.forms.completeAjaxForm(xht, popup, successPopupClass, form);
      },
    });
  },

  /**
   * Adds loader to the form and disables the button that was clicked.
   */
  startLoader: function($form, $button) {
    $form.addClass("cloader");
    $button.prop("disabled", true);
  },

  /**
   * Removes the loader from the form and enables the button that was clicked.
   */
  stopLoader: function($form, $button) {
    $form.removeClass("cloader");
    $button.prop("disabled", false);
  },
};
