// "Scroll to top / bottom" buttons available on every page.
(function () {
  var top = document.getElementById('scroll-top');
  var bottom = document.getElementById('scroll-bottom');
  if (!top || !bottom) return;

  top.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  bottom.addEventListener('click', function () {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: 'smooth'
    });
  });
})();
