---
layout: post
title: "Postgres with docker for local development"
date: 2022-11-01 10:05:35 -0000
category: ["Infrastructure"]
tags: [guides, infrastructure, tutorials]
description: "Whever I had project with Postgres I ended up with searching with commands to up it locally with docker, all the commands to create, update, drop database, make a postgres backup restore from postgres backup. So I put all those commands in this article to have in one place"
---

* TOC
{:toc}


<!-- Copy and paste the converted output. -->

<!-----

You have some errors, warnings, or alerts. If you are using reckless mode, turn it off to see inline alerts.
* ERRORs: 0
* WARNINGs: 0
* ALERTS: 3

Conversion time: 1.279 seconds.


Using this Markdown file:

1. Paste this output into your source file.
2. See the notes and action items below regarding this conversion run.
3. Check the rendered output (headings, lists, code blocks, tables) for proper
   formatting and use a linkchecker before you publish this page.

Conversion notes:

* Docs to Markdown version 1.0β33
* Wed Nov 02 2022 16:11:37 GMT-0700 (PDT)
* Source doc: Postgres with docker for local development
* This document has images: check for >>>>>  gd2md-html alert:  inline image link in generated source and store images to your server. NOTE: Images in exported zip file from Google Docs may not appear in  the same order as they do in your doc. Please check the images!

----->



## **Why you may want to read this article**

`Disclaimer`: This article DOES NOT contain any rocket science information, or anything extraordinary, it is created for convenience only to have everything on hand.

During my last 5 years of experience, there were a lot of projects that used `PostgreSQL` as the main database.

For sure, to develop such projects - you need to set up a database locally all the time. In my opinion docker - is the most convenient and quick way to set up external services for local development.

On top of that, I had experience setting up Postgres for production in an on-prem environment.

So this article is about a bunch of commands that you may find useful. I decided to collect them all together in one place to not googling them all the time.

<br>

## **Prerequisites**


### **Docker**

For sure you could use direct installation by exe (Windows) or command line. There are different drawbacks.

I prefer docker because you :

* keep your app isolated
* keep your app more controllable
* you can easily turn it off/on
* you easily control all configs including ports, user/password
* you can set up multiple instances of Postgres on different ports
* …

You should have an understanding of basic things in docker. It is better to learn them outside, but I will leave definitions here for convenience.

<br>

### **PgAdmin (optional)**

 

This is a pretty convenient UI application for the Postgres database. But, as a true SE, we are too lazy to install it separately - so we will use the command line.


<br>

### **Terminology**

`Image` - set of instructions about how to make your container

`Container` - is running or not running an application inside the docker

`Volume` - is a mechanism to persist data out of the conteiner’s life. So if the container is dropped the data stays persisted by volume. The mechanism is usually syncing data from the container in the host operating system.


<br>

## **Use case: Setting up using docker run**

Simple use case if you have raw docker, you could leverage the command line.

First, create volume:

```

docker volume create pgdata

```

Then let’s create and run a postgres container with the name “postgres”, on default port 5432, with “root” login and “root” password, and map “pgdata” volume to Postgres’ data.

```

docker run -p 5432:5432 --name postgres -v pgdata:/var/lib/postgresql/data -e POSTGRES_PASSWORD=root -e POSTGRES_USER=root -d postgres:14

```


<br>

## **Use case: Setting up using docker-compose**

Just create `docker-compose.yml` file somewhere and put this into it:

```

version: "3.7"

services:
  db:
    image: postgres
    container_name: postgres
    ports:
      - 5432:5432
    volumes:
      - db-data:/var/lib/postgresql/data
    environment:
      POSTGRES_USER: root
      POSTGRES_PASSWORD: root

volumes:
  db-data:

```

Then go to the folder that contains `docker-compose.yml` and run from it using cmd:

```

docker-compose up -d

```


[![alt_text](/assets/2022-11-01-postgres-with-docker-local-development/image2.png "image_tooltip")](/assets/2022-11-01-postgres-with-docker-local-development/image2.png "image_tooltip")


With this command, we did pretty much the same as using just run command: mapped volume to Postgres’ data, created a container with root login and root password, and default port.

<br>


## **Commands**

`Go inside the container:`

```

docker exec -it postgres bash

```

`Connect to database:`

```

psql -h 127.0.0.1 -p 5432 -U root

```


[![alt_text](/assets/2022-11-01-postgres-with-docker-local-development/image3.png "image_tooltip")](/assets/2022-11-01-postgres-with-docker-local-development/image3.png "image_tooltip")


`To list all databases:`

```

\l

```

`Create database:`

```

#option 1

psql -h 127.0.0.1 -p 5432 -U root

CREATE DATABASE "Test";

#option 2

psql -h 127.0.0.1 -p 5432 -U root -c 'CREATE  DATABASE "Test2"'

```

`Drop database:`

```

#option 1

psql -h 127.0.0.1 -p 5432 -U root

DROP DATABASE "Test";

#option 2

psql -h 127.0.0.1 -p 5432 -U root -c 'DROP  DATABASE "Test2"'

```

`Connect to database:`

```

\c <DBNAME>

```

`List tables in the connected database:`

```

\dt

```


[![alt_text](/assets/2022-11-01-postgres-with-docker-local-development/image1.png "image_tooltip")](/assets/2022-11-01-postgres-with-docker-local-development/image1.png "image_tooltip")


`To make a backup (the file will be created on host machine):`

```

docker exec postgres pg_dump Test  > dump.sql

```

`Restore database from backup (you first should create db using commands above):`

```

docker cp ./dump.sql postgres:/dump.sql

docker exec -it postgres bash

psql -h 127.0.0.1 -p 5432 -U root -c 'CREATE DATABASE "Test2"'

psql -h 127.0.0.1 -U root -d Test2 < dump.sql

```
