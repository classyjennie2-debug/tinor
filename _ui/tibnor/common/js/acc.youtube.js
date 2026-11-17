function onYouTubeIframeAPIReady() {
  var data = ACC.players.data;
  var videos = ACC.players.videos;
  if (data.length) {
    data.forEach(function(el, index) {
      var idPlayer = el[0];
      var idVideo = el[1];
      videos[`${idPlayer}-${idVideo}`] = new YT.Player(idPlayer, {
        width: "100%",
        videoId: idVideo,
        events: {
          onReady:
            data.length - 1 === index
              ? ACC.youtube.handleYtVideo(videos)
              : false,
        },
      });
    });
  }
}

ACC.youtube = {
  _autoload: ["bindInitial"],

  bindInitial: function () {
    if ($(".js-yt-video").length) {
      ACC.youtube.bindYtApi();
    }
  },
  bindYtApi: function () {
    return;
  },
  handleYtVideo: function (players) {
    $(".js-yt-image").on("click", function () {
      var componentId = $(this).data("componentId");
      var videoId = $(this).data("id");
      players[`${componentId}-${videoId}`].playVideo();
      $(this).fadeOut();
    });
  },
};
