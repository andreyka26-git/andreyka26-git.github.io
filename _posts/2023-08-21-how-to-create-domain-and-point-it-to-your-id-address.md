---
layout: post
title: "How to create domain and point it to your IP address"
date: 2023-08-22 11:02:35 -0000
category: ["Infrastructure"]
tags: [domain, infrastructure, ip]
description: "In this article we will discuss about how to buy a domain name using some domain name registras, and how to map the domain to an IP address. In other word we will point the domain name to the server IP, using Nginx as a reverse proxy inside the docker with basic react application."
thumbnail: /assets/2023-08-21-how-to-create-domain-and-point-it-to-your-id-address/logo.png
thumbnailwide: /assets/2023-08-21-how-to-create-domain-and-point-it-to-your-id-address/logo-wide.png
---
<br>

* TOC
{:toc}

<!-- Output copied to clipboard! -->

<!-----

You have some errors, warnings, or alerts. If you are using reckless mode, turn it off to see inline alerts.
* ERRORs: 0
* WARNINGs: 0
* ALERTS: 7

Conversion time: 2.435 seconds.


Using this Markdown file:

1. Paste this output into your source file.
2. See the notes and action items below regarding this conversion run.
3. Check the rendered output (headings, lists, code blocks, tables) for proper
   formatting and use a linkchecker before you publish this page.

Conversion notes:

* Docs to Markdown version 1.0β34
* Tue Aug 22 2023 08:27:00 GMT-0700 (PDT)
* Source doc: How to create domain and point it to your IP address
* This document has images: check for >>>>>  gd2md-html alert:  inline image link in generated source and store images to your server. NOTE: Images in exported zip file from Google Docs may not appear in  the same order as they do in your doc. Please check the images!

----->



## **Why you may want to read this article**

When I’m doing some infrastructure stuff I realized that I did it in the past about 1 year ago but now I don’t remember anything. Then I end up googling it from scratch which is irritating, especially when you recall an exact article that you cannot find for some reason now.

This article will be about buying domain and configuring this domain to point to the IP of your server, more precisely to point into your application inside the docker container through nginx acting as a reverse proxy.


## **Presetup**

I have an Ubuntu server, and hosted web application there. I want that each time the user enters my domain name (symptom-diary.com) my React page is loaded in the user’s browser.

To do that, we will



* Buy domain
* Make it point to my server’s IP
* Configure Nginx as a reverse proxy
* Direct incoming requests to React application through the nginx


## **Buying domain**

To buy a domain you need to go to one of the many [domain registrars](https://en.wikipedia.org/wiki/Domain_name_registrar). In short, `domain registrar` is the service that manages domains and provides an ability for end users to buy and operate these domains.

Why are there many domain registrars, not only one? How come they do not conflict with each other? Each domain registrar talks to a global domain name registry maintained by not profit organization [ICANN (Internet Corporation for Assigned Names)](https://en.wikipedia.org/wiki/ICANN).


You can choose any domain registrar you want. Most of them have pretty close prices and user-friendly UIs. You need to find a free (not bought and occupied) domain and buy it.


In my case I used Domain.com


[![alt_text](/assets/2023-08-21-how-to-create-domain-and-point-it-to-your-id-address/image7.png "image_tooltip")](/assets/2023-08-21-how-to-create-domain-and-point-it-to-your-id-address/image7.png "image_tooltip"){:target="_blank"}



## **Check domain name points to the wrong IP**

There are a bunch of ways to check where the domain is pointing to. 




* Google some DNS lookup services and paste the domain name there.
* Use tools like `nslookup`
* Paste the domain into the browser and see where it will direct you.


[![alt_text](/assets/2023-08-21-how-to-create-domain-and-point-it-to-your-id-address/image2.png "image_tooltip")](/assets/2023-08-21-how-to-create-domain-and-point-it-to-your-id-address/image2.png "image_tooltip"){:target="_blank"}


Neither of these IPs is the IP of my server, so let’s configure it to point to our IP in the Domain Name Registrar.

## **Configure domain to point to our IP**

In my Domain Name Registrar I followed those tabs:

`Manage (clicked on my domain)` -> `DNS & Nameservers` -> `DNS Records`


[![alt_text](/assets/2023-08-21-how-to-create-domain-and-point-it-to-your-id-address/image6.png "image_tooltip")](/assets/2023-08-21-how-to-create-domain-and-point-it-to-your-id-address/image6.png "image_tooltip"){:target="_blank"}

You can see a lot of default DNS records pointing to wrong IP by default



### **Create A root domain record (@)**

Now we should:



* Delete existing Record `A` with Name `@`
* Add new Record `A` with Name `@` with the value of our own IP



### **Create A www domain record**

For this, we should:



* Delete existing Record `A` with Name `www`
* Add new Record `A` with name `www` with the value of our own IP


[![alt_text](/assets/2023-08-21-how-to-create-domain-and-point-it-to-your-id-address/image5.png "image_tooltip")](/assets/2023-08-21-how-to-create-domain-and-point-it-to-your-id-address/image5.png "image_tooltip"){:target="_blank"}


I left the default TTL (1 hour).

Starting from that point we should wait for some time until all DNS servers pick up updated value.


## **Check Domain name points to new Ip Address**

After about 1 hour I  went to the first [DNS Lookup link](https://www.google.com/search?q=dns+lookup&rlz=1C1GCEU_en-GB__1043__1043&oq=dns+lookup&aqs=chrome.0.69i59j69i64j0i512l3j69i60l3.1789j0j7&sourceid=chrome&ie=UTF-8) in Google, and pasted my domain:


[![alt_text](/assets/2023-08-21-how-to-create-domain-and-point-it-to-your-id-address/image4.png "image_tooltip")](/assets/2023-08-21-how-to-create-domain-and-point-it-to-your-id-address/image4.png "image_tooltip"){:target="_blank"}

I can see that IP changed from 66.96…. to the IP of my server.

It also can be visible from `nslookup`:


[![alt_text](/assets/2023-08-21-how-to-create-domain-and-point-it-to-your-id-address/image3.png "image_tooltip")](/assets/2023-08-21-how-to-create-domain-and-point-it-to-your-id-address/image3.png "image_tooltip"){:target="_blank"}



## **Configure Nginx on the server**

After our domain points to the correct IP, we would like it to point to specific application.


Let’s say I have React App run inside docker container that has the name `symptom-tracker-dev` with internal port `3000`.

On top of that, I have a reverse proxy (Nginx) run in the container called `nginx`.

`docker-compose.yml`

```
version: '3'

services:
  nginx:
    container_name: nginx
    image: nginx:latest
    restart: always
    volumes:
      - ./conf.d:/etc/nginx/conf.d
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./nginx-logs:/var/log/nginx
    ports:
      - 80:80
      - 443:443
    networks:
      - nginx-network
      - default
networks:
  nginx-network:
    external: true
```

It is a simple Nginx container with 80 and 443 ports exposed. In this article we will not do SSL/TLS certificates, so you would need only 80 port. I assume most of you actually would like to have an SSL certificate, so in this case - keep the 443 port opened as well.

`nginx.conf`

```
user  nginx;

worker_processes  auto;
error_log  /var/log/nginx/error.log warn;
pid        /var/run/nginx.pid;

events {
    worker_connections  1024;
}

http {
    client_max_body_size 10M;
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                      '$status $body_bytes_sent "$http_referer" '
                      '"$http_user_agent" "$http_x_forwarded_for"';

    access_log  /var/log/nginx/access.log  main;
    sendfile        on;
    keepalive_timeout  65;

    include /etc/nginx/conf.d/*.conf;
}
```

This nginx.conf does not have anything special as well, only basic configuration, and in the last line - we include all nginx sub configurations.

`conf.d/symptoms-dev.conf`

```
#frontend dev env

server {
    listen 80;
    server_name symptom-diary.com;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        proxy_set_header Host $host;
        return 301 https://symptom-diary.com$request_uri;
    }
}

server {

    listen 443 ssl;

    server_name symptom-diary.com;

    ssl_certificate /etc/letsencrypt/live/symptom-diary.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/symptom-diary.com/privkey.pem;

    location / {
        #this needed to resolve host by docker dns, othervise 'set $upstream will' not work
        resolver 127.0.0.11 valid=10s;

        #this variable needed to not fail nginx if any of the containers is down
        set $upstream http://symptom-tracker-dev:3000;

        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $host;
        proxy_pass $upstream;
    }
}
```

This configuration is designed for a secured connection with HTTPS (TLS/SSL) under the 443d port and unsecured with the 80th port.

For secured port - you would need to put your .pem files to `/etc/letsencrypt/live/symptom-diary.com/fullchain.pem;` and `/etc/letsencrypt/live/symptom-diary.com/privkey.pem;`.

The first chunk of configuration is listening to our bought domain under the 80th port and redirecting the request from http to https (443d port).

The second chunk of configuration is listening to the 443d port of our domain (`symptom-diary.com`) and directing the request to the docker container with `symptom-tracker-dev` name and `3000` port (default React port).


## **Demo**

We can type our domain into the browser and see it loads my React application hosted in the docker container.


[![alt_text](/assets/2023-08-21-how-to-create-domain-and-point-it-to-your-id-address/image1.png "image_tooltip")](/assets/2023-08-21-how-to-create-domain-and-point-it-to-your-id-address/image1.png "image_tooltip"){:target="_blank"}

