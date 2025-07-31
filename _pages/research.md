---
title: "Akash Krishna - Research"
layout: textlay
excerpt: "Research themes and approach of Akash Krishna."
sitemap: false
permalink: /research/
---

# Research

My goal is to understand and optimize modern "click" reactions using state-of-the-art computational tools. By forming and breaking bonds at molecular level, we can design more efficient, sustainable, and precisely controllable reactions for use in materials science and chemical biology.

### My Approach
My work is primarily computational, integrating expertise in quantum chemistry and computer science. By leveraging a suite of powerful tools, we can move beyond trial-and-error and uncover the fundamental principles that govern reactivity. Key techniques I use include:

**Density Functional Theory (DFT)**: To model the electronic structure of molecules and predict their behavior.

**Energy Decomposition Analysis (EDA)**: To break down the forces of a chemical bond into understandable parts (like electrostatic and orbital interactions), revealing *why* a reaction is favorable.

**Ab Initio Molecular Dynamics (AIMD)**: To simulate the real-time movement and interactions of atoms and molecules during a reaction.

**Machine Learning (ML)**: To analyze complex simulation data and build predictive models that accelerate the discovery of new and improved reactions.

### Research Themes
Here are some of the key themes I am currently focused on:

{% for item in site.data.research %}
<div class="theme-item">
    {% if item.image %}
    <div class="theme-image">
        <img src="{{ site.url }}{{ site.baseurl }}{{ item.image }}" alt="{{ item.alt }}" />
    </div>
    {% endif %}
    <div class="theme-text">
        <h4>{{ item.title }}</h4>
        <p>{{ item.text }}</p>
    </div>
</div>
{% endfor %}

... and more.