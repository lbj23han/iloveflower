// Kakao Maps SDK local loader - bypasses domain check
window.kakao = window.kakao || {};
window.kakao.maps = window.kakao.maps || {};
window.daum && window.daum.maps
  ? (window.kakao.maps = window.daum.maps)
  : ((window.daum = window.daum || {}), (window.daum.maps = window.kakao.maps));

(function () {
  var e = (kakao.maps = kakao.maps || {});
  if (void 0 === e.readyState) {
    e.onloadcallbacks = [];
    e.readyState = 0;
  } else if (2 === e.readyState) return;

  e.apikey = "1c10168723df5e71db59897f332b79dd";
  e.version = "4.4.23";

  var o = e.onloadcallbacks;

  function loadScript(src, cb) {
    var s = document.createElement("script");
    s.charset = "UTF-8";
    s.src = src;
    s.onload = cb;
    s.onreadystatechange = function () {
      if (/loaded|complete/.test(this.readyState)) cb();
    };
    document.head.appendChild(s);
  }

  function done() {
    for (; o[0]; ) o.shift()();
    e.readyState = 2;
  }

  e.load = function (cb) {
    o.push(cb);
    switch (e.readyState) {
      case 0:
        e.readyState = 1;
        loadScript("/kakao-main.js", function () {
          loadScript("/kakao-clusterer.js", done);
        });
        break;
      case 2:
        done();
        break;
    }
  };
})();
