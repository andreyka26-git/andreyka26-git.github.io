---
layout: post
title: "Firebase emulator in docker locally"
date: 2024-01-31 11:02:35 -0000
category: ["Firebase"]
tags: [firebase, guides, infrastructure, tutorials]
description: "In this article we are going to complitely dockerize (put inside the docker) the following emulators locally: firebase functions, firebase firestore, firebase auth and run them all locally using docker compose"
thumbnail: /assets/2024-01-31-firebase-emulator-in-docker/logo.png
thumbnailwide: /assets/2024-01-31-firebase-emulator-in-docker/logo-wide.png
---

<br>

* TOC
{:toc}


<!-----

You have some errors, warnings, or alerts. If you are using reckless mode, turn it off to see inline alerts.
* ERRORs: 0
* WARNINGs: 0
* ALERTS: 4

Conversion time: 2.089 seconds.


Using this Markdown file:

1. Paste this output into your source file.
2. See the notes and action items below regarding this conversion run.
3. Check the rendered output (headings, lists, code blocks, tables) for proper
   formatting and use a linkchecker before you publish this page.

Conversion notes:

* Docs to Markdown version 1.0β35
* Wed Jan 31 2024 13:07:55 GMT-0800 (PST)
* Source doc: Firebase emulator in docker
* This document has images: check for >>>>>  gd2md-html alert:  inline image link in generated source and store images to your server. NOTE: Images in exported zip file from Google Docs may not appear in  the same order as they do in your doc. Please check the images!

----->



## **Why you may want to read this article**

Lately I discovered firebase as a really good tool if you don’t have time or desire to write your backend: auth, databases, storages and http endpoints.

The only problem I had was the firebase emulator. It just does not have any official docker support. 
 
I was struggling with putting 3 necessary emulators inside the docker container: `auth`, `firestore`, `functions`. 


So if you want to run locally in docker your firebase functions along with auth and firestore (database) with single `docker compose up` - this article is for you.


## **Introduction (Struggling)**

First, I needed only the Firestore and Auth tool for my React SPA client. I successfully launched them using some docker image that I found in the middle of nowhere:

`docker run -d -p=9000:9000 -p=8080:8080 -p=4000:4000 -p=9099:9099 -p=8085:8085 -p=5001:5001 -p=9199:9199 --env "GCP_PROJECT=***" --env "ENABLE_UI=true" --name emulator spine3/firebase-emulator`

 
The problem here is that the functions were disabled (OFF). Besides that the repo that refers to this docker image was already focusing on GCP emulation rather than firebase.

Then I spent the whole day trying to find something working. I got all 15 first links opened, tried about 7 different repos, talked to bing chat and chat gpt for 2-3 hours trying to make it work, but there was always something that didn’t work.

 
A lot of times the problem was in auth, I don’t even know why it was needed when I wanted just to create an emulator locally, I got a lot of problems with outdated base node images with which firebase-tool does not work. A lot of problems with dependencies, e.g. java was not set up correctly, etc. 
 
Now I combined all the knowledge and resolved issues  together and produced one repo that covers everything.


## **Repo structure**

Since we are going to have functions, we will follow [official documentation](https://firebase.google.com/docs/functions/local-shell), so we have 1 folder called `functions` where all our firebase functions code resides.

The full source code is located in my [Github repository](https://github.com/andreyka26-git/firebase-docker-emulators).


### **Add [functions/index.js](https://github.com/andreyka26-git/firebase-docker-emulators/blob/main/firebase-function/functions/index.js)**

```js
const { onRequest } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { firestore } = require("firebase-admin");

initializeApp();

exports.handleRequest = onRequest(async (req, res) => {
  console.log('[handleRequest] running inside the http method');

  const collectionName = 'your_collection_name';

  const documentData = {
    query: req.query.text
  };

  try {
    const collectionRef = firestore().collection(collectionName);
    await collectionRef.add(documentData);

    res.json({ result: `Document added to Firestore` });
  } catch (error) {
    console.error('Error adding document: ', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
```

Here I created the simplest function possible that listens to http calls and writes to firestore data received from the query parameter. This function is more like a starting point to continue with functions development.


### **Add [Dockerfile](https://github.com/andreyka26-git/firebase-docker-emulators/blob/main/firebase-function/Dockerfile)**

```docker
FROM node:20-bullseye-slim

RUN apt update -y && apt install -y openjdk-11-jdk bash

RUN npm install -g firebase-tools

COPY . .

RUN npm --prefix ./functions install

# somehow the docker didn't see entrypoint.sh if I just copy it from the source folder however it does exist when checking with `ls la`
RUN echo '#!/bin/sh \n firebase emulators:start' > ./entrypoint.sh && \
    chmod +x ./entrypoint.sh

ENTRYPOINT ["./entrypoint.sh"]
```

We are starting with a node image, if needed - any other tag might be taken.

`apt update -y && apt install -y openjdk-11-jdk bash` - installs jdk and bash (bash is for convenience to be able to run commands inside the container if you need).

`npm install -g firebase-tools` - installs firebase cli with which we can run all emulators. 


`COPY . .`-  copies whole current directory content to the docker container, except node_modules, dockerfile and readme which we excluded in .dockerignore.

`RUN npm --prefix ./functions install` - builds functions folder with all dependencies that are needed for functions. For now only JS is supported in this dockerfile.

```
RUN echo '#!/bin/sh \n firebase emulators:start' > ./entrypoint.sh && \
    chmod +x ./entrypoint.sh
```


The line above creates file `entrypoint.sh` with the  following shell commands:

```sh
#!/bin/sh
firebase emulators:start
```

and grants execute permission to the file to be able to execute it later.

`ENTRYPOINT ["./entrypoint.sh"]` - sets entrypoint for docker container to the file we have created above.


### **Add [firebase.json](https://github.com/andreyka26-git/firebase-docker-emulators/blob/main/firebase-function/firebase.json)**

```
{
  "functions": {
    "predeploy": [
      "npm --prefix ./functions run lint",
      "npm --prefix ./functions run build"
    ],
    "source": "functions"
  },
  "emulators": {
    "functions": {
      "host": "0.0.0.0",
      "port": 5001
    },
    "firestore": {
      "host": "0.0.0.0",
      "port": 8080,
      "websocketPort": 5005
    },
    "pubsub": {
      "host": "0.0.0.0",
      "port": 8085
    },
    "auth": {
      "host": "0.0.0.0",
      "port": 9099
    },
    "ui": {
      "enabled": true,
      "host": "0.0.0.0",
      "port": 4000
    }
  }
}
```

`firebase.json` is a firebase configuration file that will tell firebase-tools what to build. Here we have all running emulators specified to run on 0.0.0.0 (listen on all available network interfaces), their ports.

Besides that the important part of this config is `functions`. It will build functions code and make them available in the emulator. Without it, the functions emulator will show you that you don’t have actions and will not start.


### **Add [.firebaserc](https://github.com/andreyka26-git/firebase-docker-emulators/blob/main/firebase-function/.firebaserc)**


```
{
  "projects": {
    // This line is very important. I still don't really know why firebase emulator needs the exact project
    // most probably this is needed to load project metadata to mimic the env as close as possible
    // so put your project id here. Otherwise you will get auth (403) errors while trying to run.
    "default": "dummy-project"
  }
}
```


This is a firebase configuration file, here we just specify our project id. Most probably it is needed to get metadata. But it is required as well.


### **Add [docker-compose.yml](https://github.com/andreyka26-git/firebase-docker-emulators/blob/main/firebase-function/docker-compose.yml)**

```yml
version: '3'

services:
  firebase:
    container_name: firebase-emulator
    build:
      context: .
    ports:
      - 8080:8080 # **FIRESTORE_PORT**
      - 5005:5005 # **FIRESTORE_WS_PORT**
      - 4000:4000 # **UI_PORT**
      - 8085:8085 # **PUBSUB_PORT**
      - 5001:5001 # **FUNCTIONS_PORT**
      - 9099:9099 # **AUTH_PORT**
```


Just regular docker-compose.yml. I created it for simplicity, I just want to have everything up with 1 command. We only expose ports to the machine and set the container name.


## **Demo**

To run the demo you need to go to root directory and run command `docker compose up -d`. This will build and start a docker container with emulators.


[![alt_text](/assets/2024-01-31-firebase-emulator-in-docker/image4.png "image_tooltip")](/assets/2024-01-31-firebase-emulator-in-docker/image4.png "image_tooltip"){:target="_blank"}
 
We can see from build logs and container logs that all emulators set up successfully. 
 
Navigate to [http://localhost:4000/](http://localhost:4000/)

You will see emulator ui. 


[![alt_text](/assets/2024-01-31-firebase-emulator-in-docker/image2.png "image_tooltip")](/assets/2024-01-31-firebase-emulator-in-docker/image2.png "image_tooltip"){:target="_blank"}


To test our function navigate to this link

[http://localhost:5001/dummy-project/us-central1/handleRequest?text=%22qqqqqqqqqqqq%22](http://localhost:5001/dummy-project/us-central1/handleRequest?text=%22qqqqqqqqqqqq%22)


[![alt_text](/assets/2024-01-31-firebase-emulator-in-docker/image3.png "image_tooltip")](/assets/2024-01-31-firebase-emulator-in-docker/image3.png "image_tooltip"){:target="_blank"}
 
 
You will see that the expected successful response was returned. Let’s observe the document  that was added by this function in Firestore.


[![alt_text](/assets/2024-01-31-firebase-emulator-in-docker/image1.png "image_tooltip")](/assets/2024-01-31-firebase-emulator-in-docker/image1.png "image_tooltip"){:target="_blank"}

The logs of function execution could be seen from the docker container logs if you need them.

## **Conclusion**

I’m pretty happy with Firebase overall, but lack of some documentation about setting it up with docker, auth info, proper documentation about storages querying etc makes me upset and angry. On top of that the fact that it is not open source and you cannot just solve your problem makes it even worse. 
 
But anyway, we made it work. I guess the repository I have mentioned here can be used as a starting point to your backend. You can do main stuff that might be needed in the backend:

Http endpoints, database, storage, auth, etc. 
 
Thank you for your attention.

My projects:

Symptom Diary: [https://blog.symptom-diary.com/](https://blog.symptom-diary.com/)

Pet4Pet: [https://pet-4-pet.com/](https://pet-4-pet.com/)
