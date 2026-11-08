(function () {
  var btn = document.getElementById('menuBtn');
  var nav = document.getElementById('mainNav');
  if (btn && nav) {
    btn.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }
  var main = document.getElementById('mainImg');
  document.querySelectorAll('.thumbs button').forEach(function (b) {
    b.addEventListener('click', function () { if (main) main.src = b.dataset.src; });
  });
})();
