function getReCaptchaResponseContact(token) {
  var recaptchaForm = $(".js-g-recaptcha-contact").closest("form");
  recaptchaForm.find(".js-g-reCaptchaVal").val(token);
  ACC.recaptcha.submitForm(recaptchaForm);
}

function getReCaptchaResponseCustomer(token) {
  var recaptchaForm = $(".js-g-recaptcha-customer").closest("form");
  recaptchaForm.find(".js-g-reCaptchaVal").val(token);
  ACC.recaptcha.submitForm(recaptchaForm);
}

function getReCaptchaResponseInvoice(token) {
  var recaptchaForm = $(".js-g-recaptcha").closest("form");
  recaptchaForm.find(".js-g-reCaptchaVal").val(token);
  recaptchaForm.submit();
}

function onReCaptchaExpired() {
  if (window.grecaptcha) {
    grecaptcha.reset();
  }
}
var intervalGrecaptcha;
var pingCount = 1;

ACC.recaptcha = {
  _autoload: [
    ["bindReCaptcha", $(".js-g-recaptcha").length !== 0],
    "bindRegisterForm",
  ],
  vatVal: "",

  bindReCaptcha: function () {
    var apiReCaptchaSrc = "//www.google.com/recaptcha/api.js";
    $("head").append(
      $("<script>")
        .attr("async", true)
        .attr("defer", true)
        .attr("type", "text/javascript")
        .attr("src", apiReCaptchaSrc)
    );
    ACC.recaptcha.checkingInit();
  },

  checkingInit: function () {
    intervalGrecaptcha = window.setInterval(function () {
      if (window.grecaptcha) {
        $(".js-g-recaptcha").removeClass("hidden");
        clearInterval(intervalGrecaptcha);
      } else if (pingCount++ === 5) {
        clearInterval(intervalGrecaptcha);
        alert("Sth is wrong with g-reCaptcha. You can not proceed form.");
      };
    }, 200);
  },

  clearForm: function (form) {
    if (window.grecaptcha) {
      grecaptcha.reset();
      ACC.forms.clearForm(form);
    } else {
      setTimeout(function () {
        alert(" Sth is wrong with g-reCaptcha. The page will be refreshed");
        location.reload();
      }, 500);
    }
  },

  handleVatValue: function () {
    var vat = $('[name="vat"]');
    if (vat) {
      ACC.recaptcha.vatVal = vat.val();
      vat.val(ACC.recaptcha.vatVal.replace("-", ""));
    }
  },

  bindRegisterForm: function () {
    var formId = "tibnorRegisterForm";
    var form = $("form#" + formId);

    if (form.length) {
      var popup = $(document)
        .find("#" + formId + "Popup")
        .html();
      var vat = form.find('[name="vat"]');
      var callback = function () {
        vat.val(ACC.recaptcha.vatVal);
      };

      ACC.forms.newAjaxForm(form, formId, popup, "success-popup", callback);
    }
  },

  submitForm: function (form)
  {
    const $formSubmitBtn = form.find('button');
    const loaderScope = form.parents(".js-panel");
    ACC.forms.startLoader(loaderScope, $formSubmitBtn);

    var actionUrl = form.attr('action');
    $.ajax({
      type: "POST",
      url: actionUrl,
      data: form.serialize(),
      success: function()
      {
        ACC.forms.stopLoader(loaderScope, $formSubmitBtn);
        ACC.recaptcha.showSuccessPopup();
      },
      error: function (data)
      {
        ACC.forms.stopLoader(loaderScope, $formSubmitBtn);
        ACC.recaptcha.clearForm(form);
        ACC.forms.errorAjaxForm(data, form);
      }
    });
  },

  showSuccessPopup: function ()
  {
    ACC.colorbox.open("", {
      html: $("#tibnorRegisterFormPopup").html(),
      width: "500px",
      reposition: false,
      closeButton: false,
      onComplete: function () {
        $(this).colorbox.resize();
      },
      className: "success-popup",
    });
  }
};
