---
layout: page
title: ".NET Auth Internals"
permalink: /categories/.NET Auth Internals/
---

<h5> Posts by Category : {{ page.title }} </h5>

<div class="card">
{% for post in site.categories[".NET Auth Internals"] %}
 <li class="category-posts"><span>{{ post.date | date_to_string }}</span> &nbsp; <a href="{{ post.url }}">{{ post.title }}</a></li>
{% endfor %}
</div>
