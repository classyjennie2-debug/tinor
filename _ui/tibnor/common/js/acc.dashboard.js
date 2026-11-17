ACC.dashboard = {
  _autoload: ["handleActivity", "bindMyOrdersStat", "bindChart"],

  handleActivity: function (refresh) {
    if (window.location.pathname.includes("dashboard")) {
      var formData = {
        shipTo: "",
        status: "ALL",
        type: "ALL",
        maxCount: 6,
      };

      var now = Date.now();
      var fromDate = now - 30 * 86400000; // days

      formData.toDate = $.datepicker.formatDate("yy-mm-dd", new Date());
      formData.fromDate = $.datepicker.formatDate(
        "yy-mm-dd",
        new Date(fromDate)
      );

      var params = JSON.stringify(formData);
      var url = "/rest/activity/list";

      $.ajax({
        type: "POST",
        url: ACC.config.encodedContextPath + url,
        data: params,
        contentType: "application/json",
        headers: {
          CSRFToken: ACC.config.CSRFToken,
        },
        success: function (data) {
          if (data) {
            if (refresh) {
              $(".js-dashboard-activities-rows").empty();
            }
            var activitiesTpl = $("#activityRows").html();
            var template = Handlebars.compile(activitiesTpl);
            var activities = template({ activityRows: data });

            $(".js-dashboard-activities-rows").append(activities);
          }
        },
        // error: function (xht, textStatus, ex) {},
        complete: function () {
          $(".js-loader").addClass("hidden");
        },
      });
    }
  },

  bindMyOrdersStat: function () {
    var statlist = $(".js-my-orders-stat");
    if (statlist.length) {
      var formatDate = function (date) {
        return new Date(date).toISOString().split("T")[0];
      };
      var range = 30; // 30 days
      var day = 3600000 * 24;
      var today = Date.now();
      var url =
        "/rest/order/details/salestotals/" +
        formatDate(today - range * day) +
        "/" +
        formatDate(today + day);

      $.ajax({
        type: "GET",
        url: ACC.config.encodedContextPath + url,
        contentType: "application/json",
        headers: {
          CSRFToken: ACC.config.CSRFToken,
        },
        success: function (data) {
          if (data) {
            statlist.find(".js-my-orders-stat-val").each(function () {
              var type = $(this).data("type").split(',');

              var items = data.filter(function (a) {
                return type.includes(a.status) && a.orderType === "SALES_ORDER";
              });

              const totalCount = items.reduce(function (a, b) {
                return a + b.count;
              }, 0);

              $(this)
                .text(`${totalCount}`)
                .removeClass("loader");
            });
          }
        },
        error: function () {
          $(".js-my-orders-stat-val").text("-").removeClass("loader");
        },
      });
    }
  },

  bindChart: function () {
    if ($("#js-salespermonth-chart").length) {
      var year = new Date().getUTCFullYear();
      var prevYear = year - 1;
      var url =
        "/rest/order/details/salespermonth/" + prevYear + "-01/" + year + "-12";

      $.ajax({
        type: "GET",
        url: ACC.config.encodedContextPath + url,
        contentType: "application/json",
        headers: {
          CSRFToken: ACC.config.CSRFToken,
        },
        success: function (data) {
          if (data.selected) {
            var prevColection = ACC.dashboard.getSalesYearColection(
              data.selected.items,
              prevYear
            );
            var currentColection = ACC.dashboard.getSalesYearColection(
              data.selected.items,
              year
            );
            var options = ACC.dashboard.getChartOptions(
              prevColection,
              currentColection
            );
            var chart = new ApexCharts(
              document.querySelector("#js-salespermonth-chart"),
              options
            );

            var summary = {
              valFromYear: data.thisYear.formattedTotal,
              valFrom12m: data.last12m.formattedTotal,
              itemsFrom12m: data.last12m.totalItemsCount,
              avgFrom12m: data.last12m.formattedAverage,
            };

            $("#js-salespermonth-chart").removeClass("loader");
            chart.render();

            Object.entries(summary).forEach(function(entry) {
              $('.js-salespermonth-val[data-type="' + entry[0] + '"]').text(entry[1]);
            });
          }
        },
      });
    }
  },

  getSalesYearColection: function (data, year) {
    return new Array(12).fill().map(function (_item, index) {
      var el = data.find(function (el) {
        return el.year === year && el.month === index + 1;
      });
      return el ? el.salesValue : 0;
    });
  },

  getChartOptions: function (prev, current) {
    return (options = {
      series: [
        {
          name: ACC.text.chartText1,
          data: prev,
        },
        {
          name: ACC.text.chartText2,
          data: current,
        },
      ],
      chart: {
        toolbar: { show: false },
        height: 300,
        type: "line",
        zoom: { enabled: false },
        dropShadow: {
          enabled: true,
          color: "#000",
          top: 18,
          left: 7,
          blur: 8,
          opacity: 0.05,
        },
      },
      colors: ["#1F4D46", "#984231"],
      dataLabels: { enabled: false },
      stroke: { curve: "smooth", width: 3 },
      tooltip: { enabled: false },
      grid: { borderColor: "#f7f7f7" },
      legend: {
        labels: { colors: "#74788D" },
        itemMargin: { horizontal: 8 },
      },
      xaxis: {
        categories: ACC.common[ACC.config.lang].monthNamesShort,
        labels: { style: { colors: "#ADB5BD" } },
      },
      yaxis: {
        labels: { style: { colors: "#ADB5BD" } },
      },
    });
  },
};
