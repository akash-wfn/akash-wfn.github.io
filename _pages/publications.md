---
title: "Akash Krishna - Publications"
layout: gridlay
excerpt: "A list of publications by Akash Krishna."
sitemap: false
permalink: /publications/
---

# Publications

## My highlights

Below are some highlights of my recent work. You can find a complete list of my publications at the end of this page or on [Google Scholar](https://scholar.google.com/citations?hl=en&user=Et0XiuEAAAAJ).

{% assign number_printed = 0 %}
{% for publi in site.data.publist %}

{% assign even_odd = number_printed | modulo: 2 %}
{% if publi.highlight == 1 %}

{% if even_odd == 0 %}
<div class="row">
{% endif %}

<div class="col-sm-6 clearfix">
 <div class="well">
  <pubtit>{{ publi.title }}</pubtit>
  {% if publi.image %}
  <img src="{{ site.url }}{{ site.baseurl }}/images/pub/{{ publi.image }}" class="img-responsive" width="33%" style="float: left; margin-right: 15px;" />
  {% endif %}
  <p>{{ publi.description }}</p>
  <p><em>{{ publi.authors }}</em></p>
  <p><strong><a href="{{ publi.link.url }}">{{ publi.link.display }}</a></strong></p>
 </div>
</div>

{% assign number_printed = number_printed | plus: 1 %}

{% if even_odd == 1 %}
</div>
{% endif %}

{% endif %}
{% endfor %}

{% assign even_odd = number_printed | modulo: 2 %}
{% if even_odd == 1 %}
</div>
{% endif %}

<p> &nbsp; </p>

## Full List of Publications

<ul>
{% for publi in site.data.publist %}
  <li>
    <strong>{{ publi.title }}</strong><br>
    <em>{{ publi.authors }}</em><br>
    <a href="{{ publi.link.url }}" target="_blank" rel="noopener noreferrer">{{ publi.link.display }}</a>
  </li>
  <br>
{% endfor %}
</ul>