// Mirror the post's table of contents into the sidebar and keep it in sync while scrolling.
// We clone kramdown's auto-generated TOC (<ul id="markdown-toc">) so the sidebar is always
// IDENTICAL to the in-article TOC: same items, same nesting, same links/ids, every article.
(function () {
  var toc = document.getElementById('toc');
  var tocCol = document.getElementById('toc-col');
  if (!toc) return;

  function hideAndStop() {
    if (tocCol) tocCol.style.display = 'none';
  }

  var body = document.querySelector('.card-body[itemprop="articleBody"]');
  if (!body) return hideAndStop();

  // kramdown emits the in-article TOC as <ul id="markdown-toc"> when a post uses "* TOC\n{:toc}".
  var source = body.querySelector('#markdown-toc');
  if (!source) return hideAndStop();

  var clone = source.cloneNode(true);
  // Strip every id from the clone (the <ul> and each <a> carry kramdown ids) so we
  // don't introduce duplicate ids into the document.
  clone.removeAttribute('id');
  Array.prototype.forEach.call(clone.querySelectorAll('[id]'), function (el) {
    el.removeAttribute('id');
  });
  toc.appendChild(clone);

  // Collect the heading targets, in document order, from the cloned anchors.
  var links = [];
  var headings = [];
  Array.prototype.forEach.call(clone.querySelectorAll('a[href^="#"]'), function (a) {
    var id = decodeURIComponent(a.getAttribute('href').slice(1));
    if (!id) return;
    var target = document.getElementById(id);
    if (!target) return;
    a.dataset.target = id;
    links.push(a);
    headings.push(target);
  });

  if (!links.length) return hideAndStop();

  // Scroll-spy: highlight the heading nearest the top of the viewport.
  var ticking = false;
  function updateActive() {
    ticking = false;
    var offset = 100; // clears the fixed navbar
    var current = null;
    for (var i = 0; i < headings.length; i++) {
      if (headings[i].getBoundingClientRect().top - offset <= 0) {
        current = headings[i].id;
      } else {
        break;
      }
    }
    if (!current && headings.length) current = headings[0].id;
    links.forEach(function (a) {
      a.classList.toggle('active', a.dataset.target === current);
    });
  }

  window.addEventListener('scroll', function () {
    if (!ticking) {
      window.requestAnimationFrame(updateActive);
      ticking = true;
    }
  });
  updateActive();
})();
