---
layout: post
title: "Generate SSL/TLS certificates for free with Nginx/Certbot"
date: 2023-09-02 11:02:35 -0000
category: ["Infrastructure"]
tags: [ssl, tls, infrastructure, certificates]
description: "In this article we will talk about how to generate SSL/TLS certificates using certbot and nginx in docker containers for free."
thumbnail: /assets/2023-09-02-generate-ssl-tls-certificates-for-free-nginx-certbot/logo.png
thumbnailwide: /assets/2023-09-02-generate-ssl-tls-certificates-for-free-nginx-certbot/logo-wide.png
---
<br>

* TOC
{:toc}


<!-- Output copied to clipboard! -->

<!-----

You have some errors, warnings, or alerts. If you are using reckless mode, turn it off to see inline alerts.
* ERRORs: 0
* WARNINGs: 0
* ALERTS: 3

Conversion time: 1.347 seconds.


Using this Markdown file:

1. Paste this output into your source file.
2. See the notes and action items below regarding this conversion run.
3. Check the rendered output (headings, lists, code blocks, tables) for proper
   formatting and use a linkchecker before you publish this page.

Conversion notes:

* Docs to Markdown version 1.0β34
* Sat Sep 02 2023 05:44:02 GMT-0700 (PDT)
* Source doc: Generate SSL/TLS certificates for free with Nginx/Certbot
* This document has images: check for >>>>>  gd2md-html alert:  inline image link in generated source and store images to your server. NOTE: Images in exported zip file from Google Docs may not appear in  the same order as they do in your doc. Please check the images!

----->



## **Why you may want to read this article**

Today it is a continuation of my short Infrastructure-related articles.

This article will be about creating and configuring SSL/TLS certificates (https) for your domain and IP.


## **Presetup**

I have my Ubuntu server, domain that points to this server, Nginx reverse proxy in the docker container, and React application in the container as well. Each request that goes to my application is not protected, because it uses http protocol (not https).

I would like to make my application more secure by adding https functionality for free, without any cost.

To do that, we will



* Certbot tool inside the docker container that will generate certificates for domain
* Configure Nginx to use those SSL/TLS certificates


## **Configuring Nginx**


### **Nginx and certbot docker-compose**

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
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
      - ./nginx-logs:/var/log/nginx
    ports:
      - 80:80
      - 443:443
    networks:
      - nginx-network
      - default

  certbot:
    image: certbot/certbot:latest
    volumes:
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
    networks:
      - nginx-network

networks:
  nginx-network:
    external: true
```

This docker-compose file contains `nginx` service specification. We created a volume for the nginx configuration to pass local configurations to the container and a volume for certificates `./certbot/…`.

We have added nginx-network, this is for encapsulation and accessibility. With this setup only containers that are inside `nginx-network` network can be accessed from nginx.

On top of that, there is `certbot` specification with the certificate volumes.


### **Nginx.conf file**

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

    # **disables nginx version**
    server_tokens off;

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

It is pretty simple nginx.conf file, just regular configurations, and in the last line we are including all the subconfigurations for nginx.


### **Application nginx subconfiguration**

`conf.d/symptoms-dev.conf`

```conf
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


#server {
#    listen 443 ssl;

#    server_name symptom-diary.com;

#    ssl_certificate /etc/letsencrypt/live/symptom-diary.com/fullchain.pem;
#    ssl_certificate_key /etc/letsencrypt/live/symptom-diary.com/privkey.pem;

#    location / {
        #this needed to resolve host by docker dns, othervise 'set $upstream will' not work
#        resolver 127.0.0.11 valid=10s;

        #this variable needed to not fail nginx if any of the containers is down
#        set $upstream http://symptom-tracker-dev:3000;

#        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
#        proxy_set_header Host $host;
#        proxy_pass $upstream;
#    }
#}
```

This is subconfiguration for my react application for demo purpose.

It has 2 parts:



* The first part is for unsecured http connection that listens to 80th port of our domain `symptom-diary.com`. The main purpose for this block is to allow certbot authenticate throught the challenge request. Other than that It just redirects the request to https connection on 443d port.
* The second part is specifying secured https connection with SSL/TLS protocols, it directs request to our application docker container `symptom-tracker-dev` on `3000` internal docker port. Until we have SSL certificates created by certbot it is unusable.

The SSL certificates are ensured by 

```
ssl_certificate /etc/letsencrypt/live/symptom-diary.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/symptom-diary.com/privkey.pem;
```

But now there is no `fullchain.pem` and `privkey.pem` files, let’s generate them. That's why the second part is commented. Now we need to generate certificates and uncomment the SSL part (second one) of configuration


## **Generate certificates**

Go to our docker-compose.yml location.

Note, that I’m generating the certificates also for 2 subdomains: `dev` and `blog`. If you would like to have only one domain - specify only one.

Run

```
docker-compose run --rm certbot certonly --webroot --webroot-path /var/www/certbot/ -d symptom-diary.com -d dev.symptom-diary.com -d blog.symptom-diary.com
```

You will see this output:


[![alt_text](/assets/2023-09-02-generate-ssl-tls-certificates-for-free-nginx-certbot/image3.png "image_tooltip")](/assets/2023-09-02-generate-ssl-tls-certificates-for-free-nginx-certbot/image3.png "image_tooltip"){:target="_blank"}


As you can see our certificates were successfully generated by [letsencrypt organization](https://letsencrypt.org/), and since we have our docker volumes they are already in our server and inside the nginx container.

Take a look into certificate expiration, by that time - you need to renew the certificate with the same command.


## **Demo**

Now let’s go and try to access our application by domain name `symptom-diary.com`


[![alt_text](/assets/2023-09-02-generate-ssl-tls-certificates-for-free-nginx-certbot/image1.png "image_tooltip")](/assets/2023-09-02-generate-ssl-tls-certificates-for-free-nginx-certbot/image1.png "image_tooltip"){:target="_blank"}


[![alt_text](/assets/2023-09-02-generate-ssl-tls-certificates-for-free-nginx-certbot/image2.png "image_tooltip")](/assets/2023-09-02-generate-ssl-tls-certificates-for-free-nginx-certbot/image2.png "image_tooltip"){:target="_blank"}


As you can see it shows TLS expiration details.


<br>

## **Follow up**

Please subscribe to my social media to not miss updates.: [Instagram](https://www.instagram.com/andreyka26_se), [Telegram](https://t.me/programming_space)

I’m talking about life as a Software Engineer at Microsoft.

<br>

Besides that, my projects:

Symptoms Diary: [https://symptom-diary.com](https://symptom-diary.com)

Pet4Pet: [https://pet-4-pet.com](https://pet-4-pet.com)