ACC.requestInvoice = {
  _autoload: ["bindRequestInvoice"],

  bindRequestInvoice: function () {
    var formId = "requestInvoiceForm";
    var form = $("form#" + formId);

    if (form.length) {
      var formContent = $(".js-invoice-content");
      var formPopup = $(".js-invoice-popup");

      form.on("submit", function (e) {
        e.preventDefault();

        var requestInvoiceUrl = form.attr("action");
        var type = form.attr("method");
        var data = $("#requestInvoiceForm")
          .serialize()
          .split("&")
          .reduce(function (acc, el) {
            var item = el.split("=");
            acc[item[0]] = item[1];
            return acc;
          }, {});

        $.ajax({
          url: requestInvoiceUrl,
          type: type,
          contentType: "application/json",
          data: JSON.stringify(data),
          success: function () {
            ACC.recaptcha.clearForm(form);
            ACC.forms.successAjaxForm(formId);

            formContent.addClass("hidden");
            formPopup.removeClass("hidden");
          },
          error: function (xhr) {
            ACC.recaptcha.clearForm(form);
            ACC.forms.errorAjaxForm(xhr, form);
          },
          complete: function (xhr) {
            var ifSuccess = xhr.status === 200;
            $(".js-error-info").toggleClass("hidden", ifSuccess);
          },
        });
      });
      $("body").on("click", ".js-back-to-invoice-form", function () {
        formContent.removeClass("hidden");
        formPopup.addClass("hidden");
      });
    }
  },
};
