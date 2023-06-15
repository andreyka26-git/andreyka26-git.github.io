---
layout: post
title: "Docker cheat sheet"
date: 2023-06-14 11:02:35 -0000
category: ["Infrastructure"]
tags: [docker, gitlab, commands, guide]
description: "This article is just a bunch of useful commands for working with docker and different clouds, for example GitLab"
thumbnail: /assets/2023-06-14-docker-cheatsheet/logo.png
thumbnailwide: /assets/2023-06-14-docker-cheatsheet/logo-wide.png
---
<br>

* TOC
{:toc}

<!-- Output copied to clipboard! -->

<!-----

You have some errors, warnings, or alerts. If you are using reckless mode, turn it off to see inline alerts.
* ERRORs: 0
* WARNINGs: 0
* ALERTS: 16

Conversion time: 5.96 seconds.


Using this Markdown file:

1. Paste this output into your source file.
2. See the notes and action items below regarding this conversion run.
3. Check the rendered output (headings, lists, code blocks, tables) for proper
   formatting and use a linkchecker before you publish this page.

Conversion notes:

* Docs to Markdown version 1.0β34
* Tue May 30 2023 17:55:55 GMT-0700 (PDT)
* Source doc: Consistent Hashing pt2: Implementation
* This document has images: check for >>>>>  gd2md-html alert:  inline image link in generated source and store images to your server. NOTE: Images in exported zip file from Google Docs may not appear in  the same order as they do in your doc. Please check the images!

----->



## **Why you may want to read this article**

When I'm doing some infrastructure stuff I realized that I did it in the past about 1 year ago but now I don't remember anything. Then I end up googling it from scratch which is irritating, especially when you recall `exactly this article` that you cannot find for some reason now.

This article contains different useful docker-related guides, commands, and tutorials along with links that will include all the to-do steps for implementing various use cases.

<br>


## **Docker and Gitlab**


### **Locally build image, push/pull to Gitlab registry with authorization**

Actual on 2023-06-15.

Real-life example, I have node js application, and I would like to build it locally using docker and push it to the registry so my team can pull and run it. Or I can do that without building.

For that you need:

#### **1. Authenticate yourself in Gitlab registry**

[Docs](https://docs.gitlab.com/ee/user/packages/container_registry/authenticate_with_container_registry.html#use-gitlab-cicd-to-authenticate)

I used Personal access token approach (PAT).

To generate Personal Access Token: 
- go to your profile: `click on avatar on avatar -> Edit Profile`
- `go to Access Tokens`
- `create new one`, personally I specified all the scopes, but I guess you need only `write_registry` and `read_registry`


On local machine login using docker cmd

```
docker login -u <your-user-name-or-email> -p <personal-access-token> registry.gitlab.com/<your-group-name>/<your-project-name>
```

`<your-user-name-or-email>` - the login name that you are using when log in to Gitlab

`<personal-access-token>` - the PAT that you have generated above

`<your-group-name>` - the group when project is located, if you go from UI to container registry you can find it in the url [https://gitlab.com/your-group-name/your-project-name/container_registry](https://gitlab.com/your-group-name/your-project-name/container_registry)

`<your-project-name>` - the project name, if you go from UI to container registry you can find it in the url [https://gitlab.com/your-group-name/your-project-name/container_registry](https://gitlab.com/your-group-name/your-project-name/container_registry)

<br>

#### **2. Build image, from the folder where Dockerfile is located**

```
docker build -t registry.gitlab.com/<your-group-name>/<your-project-name>/<image-name> .
```

`<image-name>` - the image name that you would like to see in Gitlab UI.

<br>

#### **3. Push image**

```
docker push registry.gitlab.com/<your-group-name>/<your-project-name>/<image-name>
```

After this step you can observer image is added to your registry in Gitlab UI.

[![alt_text](/assets/2023-06-14-docker-cheatsheet/image1.png "image_tooltip")](/assets/2023-06-14-docker-cheatsheet/image1.png "image_tooltip"){:target="_blank"}

#### **4. Pull image**

Before pullilng images make sure your perform [1st step](https://andreyka26.com/docker-cheatsheet#1-authenticate-yourself-in-gitlab-registry)

```
docker pull registry.gitlab.com/<your-group-name>/<your-project-name>/<image-name>
```

#### **5. Run pulled image**


```
docker run registry.gitlab.com/<your-group-name>/<your-project-name>/<image-name>
```