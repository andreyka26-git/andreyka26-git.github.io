// Auto-build a table of contents from the post headings and keep it in sync while scrolling.
(function () {
  var toc = document.getElementById('toc');
  var tocCol = document.getElementById('toc-col');
  if (!toc) return;

  var body = document.querySelector('.card-body[itemprop="articleBody"]');
  if (!body) {
    if (tocCol) tocCol.style.display = 'none';
    return;
  }

  var headings = body.querySelectorAll('h2, h3');
  if (headings.length < 2) {
    if (tocCol) tocCol.style.display = 'none';
    return;
  }

  function slugify(text) {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  var list = document.createElement('ul');
  var links = [];
  var used = {};

  headings.forEach(function (h) {
    var text = h.textContent.trim();
    if (!text) return;

    if (!h.id) {
      var base = slugify(text) || 'section';
      var id = base;
      var n = 1;
      while (used[id] || document.getElementById(id)) {
        id = base + '-' + n++;
      }
      h.id = id;
    }
    used[h.id] = true;

    var li = document.createElement('li');
    li.className = 'toc-' + h.tagName.toLowerCase();
    var a = document.createElement('a');
    a.href = '#' + h.id;
    a.textContent = text;
    a.dataset.target = h.id;
    li.appendChild(a);
    list.appendChild(li);
    links.push(a);
  });

  toc.appendChild(list);

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
