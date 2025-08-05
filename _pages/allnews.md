---
title: "News & Updates"
layout: textlay
excerpt: "All news and updates from Akash Krishna."
sitemap: false
permalink: /allnews.html
---

# News & Updates

Here you can find a complete archive of my news, achievements, and career updates.

{% for article in site.data.news %}
<p><strong>{{ article.date }}</strong> <br> {{ article.headline }}</p>
{% endfor %}