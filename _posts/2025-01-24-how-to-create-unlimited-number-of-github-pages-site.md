---
layout: post
title: "How to Create an Unlimited Number of GitHub Pages Sites"
date: 2025-01-24 11:02:35 -0000
category: ["Infrastructure"]
tags: [githubpages, blog, site]
description: "In this guide we will learn how to create second, third Github Pages site, once we created it under username.github.io. Following this guide we can create inifinite amount of new github pages sites for free"
thumbnail: /assets/2025-01-24-how-to-create-unlimited-number-of-github-pages-site/logo.png
thumbnailwide: /assets/2025-01-24-how-to-create-unlimited-number-of-github-pages-site/logo-wide.png
---

<br>

* TOC
{:toc}

<!-- You have some errors, warnings, or alerts. If you are using reckless mode, turn it off to see useful information and inline alerts.
* ERRORs: 0
* WARNINGs: 0
* ALERTS: 4 -->



## **Why you may want to read this article**

Github Pages is the best solution for me when I need to host some kind of “blog” or “site” with the content for the users. It is free to use, and does not require infrastructure maintenance as everything is hosted on Github. Jekyll sites are Static Site Generated (SSG) - which guarantees good SEO.

Once I created 1 site using Github Pages. That time I just followed the documentation, named repository with the necessary naming convention: `<username>.github.io`, and added my custom domain. The good thing about it is speed, reliability and price (free), as all infra is taken by github. 

Now I want to add additional Github Pages, site or blog. How can we do it? Let’s find out.



<br>

## **Create repository and add content of the site**

We need to create another public repository (for doing it for free).

For the first Github Pages site it should be `<username>.github.io`, where <username> is your github account. As of today the specific naming convention is not needed anymore, but I keep it as it is easier to differentiate sites from my other software projects in Github.

I will use this naming: `<prefix>.<username>.github.io`, where <prefix> is some arbitrary name that you want to add.

Add necessary source code to the repository (you could use [Jekyll minima theme](https://github.com/jekyll/minima)), commit, push. Create and push `gh-pages` from your main, and push it.

Note: it is [enough to just add](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site) index.md, index.html or README.md to the source code, Github Pages will use it as entry point and will be able to host your site.

Once you're done, and Github Actions build your branch - your site will be accessible under this path: `https://<username>.github.io/<repositoryname>/`



<br>

## **Configure Domain for the site**

If you want to have your custom domain, e.g. **andreyka.com** instead of **andreyka26-git.github.io**, you would need to buy the domain in some domain provider and configure it to work with Github Pages.

In my case I will be using a **Domain.com** provider, you could use anything else, the concept is the same. In [this article](https://andreyka26.com/how-to-create-domain-and-point-it-to-your-id-address) we bought the domain and pointed it to our server’s ip, and we're going to do something similar, but since it is not our Server it will be a bit more complex.

For the example purpose, let’s assume I want [example.com](example.com) to be my site’s domain.



<br>

#### **DNS**

In your domain  provider:


1. Create 4 A records with `@` name pointing to these ips (each record points to single ip):

```
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
```


[![alt_text](/assets/2025-01-24-how-to-create-unlimited-number-of-github-pages-site/image4.png "image_tooltip")](/assets/2025-01-24-how-to-create-unlimited-number-of-github-pages-site/image4.png "image_tooltip"){:target="_blank"}


2. Add www redirect in your DNS provider: create record with type CNAME and name “www” pointing to the `<username>.github.io`. Yes it might be confusing as your repository name is not `<username>.github.io`, but this way we tell the domain provider to point to the Github domain.


[![alt_text](/assets/2025-01-24-how-to-create-unlimited-number-of-github-pages-site/image1.png "image_tooltip")](/assets/2025-01-24-how-to-create-unlimited-number-of-github-pages-site/image1.png "image_tooltip"){:target="_blank"}




<br>

#### **Git**

In the git repository:

1. Add [CNAME file](https://github.com/andreyka26-git/live.andreyka26-git.github.io/blob/main/CNAME) to the root of the git repository with the domain name([example.com](http://example.com)), commit and push it.

```
http://example.com
```

2. Go to repository settings -> ”Code, planning, and automation” -> “Pages”. Wait until github issues SSL certificate (it will do it automatically, in 30-40 mins), and check the “Enforce HTTPS”


[![alt_text](/assets/2025-01-24-how-to-create-unlimited-number-of-github-pages-site/image3.png "image_tooltip")](/assets/2025-01-24-how-to-create-unlimited-number-of-github-pages-site/image3.png "image_tooltip"){:target="_blank"}




<br>

### **Domain Verification**

To protect yourself - it is better to do domain verification. But it can be done only after DNS records are populated (up to 24h).

Follow domain [verification process](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/verifying-your-custom-domain-for-github-pages): 

Click on the profile page (not repository settings) -> “Settings” -> ”Code, planning, and automation” -> “Pages” ->  “Add a domain” and put the domain name. 

On the Domain Provider side, create a TXT record with “_github-pages-challenge-<whatever_is_prompted_in_github>” name with the value prompted by github. Click verify (DNS record propagation can take some time).


[![alt_text](/assets/2025-01-24-how-to-create-unlimited-number-of-github-pages-site/image2.png "image_tooltip")](/assets/2025-01-24-how-to-create-unlimited-number-of-github-pages-site/image2.png "image_tooltip"){:target="_blank"}




<br>

## **Outcome**


As a result I was able to host the github pages site in a matter of hours with my custom domain, SSL, source version control and  free of charge. Most of the waiting time was to wait for the Domain provider to propagate the records.
