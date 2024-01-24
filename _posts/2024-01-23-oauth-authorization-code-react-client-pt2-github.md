---
layout: post
title: "OAuth Authorization Code React client pt2: Github"
date: 2024-01-02 11:02:35 -0000
category: ["Authorization guides"]
tags: [authorization, react-client, react, oauth, github]
description: "In this article we are going to create React client for Github OAuth Server. With this React client that runs in browser you will be able to authenticate authorize with Github and call Github API with obtained access token"
thumbnail: /assets/2024-01-23-oauth-authorization-code-react-client-pt2-github/logo.png
thumbnailwide: /assets/2024-01-23-oauth-authorization-code-react-client-pt2-github/logo-wide.png
---
<br>

* TOC
{:toc}

<!-----

You have some errors, warnings, or alerts. If you are using reckless mode, turn it off to see inline alerts.
* ERRORs: 0
* WARNINGs: 0
* ALERTS: 9

Conversion time: 2.949 seconds.


Using this Markdown file:

1. Paste this output into your source file.
2. See the notes and action items below regarding this conversion run.
3. Check the rendered output (headings, lists, code blocks, tables) for proper
   formatting and use a linkchecker before you publish this page.

Conversion notes:

* Docs to Markdown version 1.0β35
* Wed Jan 24 2024 03:15:28 GMT-0800 (PST)
* Source doc: OAuth Authorization Code React client pt2: Github
* This document has images: check for >>>>>  gd2md-html alert:  inline image link in generated source and store images to your server. NOTE: Images in exported zip file from Google Docs may not appear in  the same order as they do in your doc. Please check the images!

----->



## **Why you may want to read this article**

In the [previous part](https://andreyka26.com/oauth-authorization-code-react-client-pt1-openIddict) we made an OAuth web Client, using `React ` SPA (Single Page Application). In this part we integrated with our own OAuth Server which was built with OpenIddict and .NET. 


This article will show how to create a `Github OAuth client` using React SPA. To be precise - we will build a `Sign with Github` button, after which we will query the Github REST API to show that the obtained access token works with Github Resource Server.

Since auth is a prerequisite to integrate with Github API, thus if you would like to integrate with Github - you any way would need to implement Github authentication and authorization.


<br>

## **Implementation**

All the source code is in [this repository ](https://github.com/andreyka26-git/andreyka26-authorizations/tree/main/OAuthAndOpenIdConnect/OAuth.Github.WebClient)in Github.

Github, as any OpenId Connect provider, just follows the well [known protocol](https://openid.net/specs/openid-connect-core-1_0.html). Any OpenId Connect provider by default follows [OAuth protocol ](https://andreyka26.com/auth-from-backend-perspective-pt3-oauth-basics)by design, because it is built on top of it.

Note! Github has a bunch of problems that you need to fix, in case you would like to create a pure SPA client. Go to `Github Auth Problems` section. I provided a detailed explanation there.


<br>

### **OAuth core [entrypoint](https://github.com/andreyka26-git/andreyka26-authorizations/tree/main/OAuthAndOpenIdConnect/OAuth.OpenIddict.WebClient)**

The core of our React OAuth Client is already implemented [here](https://andreyka26.com/oauth-authorization-code-react-client-pt1-openIddict). We will just change configuration and some parts of the application. So just follow the article I referenced or clone [this part](https://github.com/andreyka26-git/andreyka26-authorizations/tree/main/OAuthAndOpenIdConnect/OAuth.OpenIddict.WebClient) of the repo.

Once you have the OpenIddict integrated React client you could follow subsequent steps.

<br>


### **Update [utils/config.js](https://github.com/andreyka26-git/andreyka26-authorizations/blob/main/OAuthAndOpenIdConnect/OAuth.Github.WebClient/src/utils/config.js)**


```jsx
// custom settings that work with OAuth server
const githubSettings = {
    authority: 'https://github.com/login/oauth/authorize',
    client_id: 'PUT_YOUR_CLIENT_ID_HERE',
    client_secret: 'PUT_YOUR_CLIENT_SECRET_HERE',
    redirect_uri: 'http://localhost:3000/oauth/callback',
    silent_redirect_uri: 'http://localhost:3000/oauth/callback',
    post_logout_redirect_uri: 'http://localhost:3000/',
    response_type: 'code',
    metadata: {
        authorization_endpoint: 'https://github.com/login/oauth/authorize',
        token_endpoint: 'http://localhost:9999/https://github.com/login/oauth/access_token',
    },
    // this is for getting user.profile data, when open id connect is implemented
    scope: 'repo'
};

export const githubConfig = {
    settings: githubSettings,
    flow: 'github'
};
```

`authority` is set to the Github OAuth server endpoint, meaning that it is  our OAuth authority that gives access_tokens and we can trust it.

`client_id` and `client_secret` you should get by registering your Github application, see `How to obtain Github Creds` section.

`redirect_uri` is the thing you are setting during Github OAuth app registration. We set it to the `/oauth/callback` route to handle callbacks with authorization code.

`silent_redirect_uri` is redirect uri used for token refresh.

`post_logout_redirect_uri` is the url the user will be redirected to after he logged out.

`response_type` is our OAuth grant. We are using `code` because we chose one of the most secure flows: authorization code. According to Github [official doc](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps) it supports only authorization code and device code flows.

 
You might notice that a new section called `metadata` was added. The reason behind it is that Github does not have a Discovery endpoint (see `Github does not have OIDC Discovery endpoint` section). But oidc-client-ts has the ability to set necessary values from Discovery endpoint by default.

The necessary `metadata` fields are `authorization_endpoint` and `token_endpoint`. The first one we will use to start OAuth flow. The second is used to exchange Authorization Code for token, when Github Authorization Server will redirect to our callback page.

The metadata actually should have had `end_session_endpoint` for logout. But in this regard Github Auth is not OIDC compliant as well (see `Github does not have end_session_endpoint`)

As you can see for some reason token_endpoint is not  pointing to github origin, but rather points to some `localhost:9999` and then to the Github domain. This happens because of the CORS issue: Github does not allow third party JS to get the token (see `Cors issue with token endpoint`, I provided a workaround and explanation). To overcome - we might use a proxy server that will disrespect Cors headers compared to browsers.

For `scopes` we set `repo` scope to be able to get private repositories of the user that was authenticated.


<br>

### **Update [services/AuthService.js](https://github.com/andreyka26-git/andreyka26-authorizations/blob/main/OAuthAndOpenIdConnect/OAuth.Github.WebClient/src/services/AuthService.js)**

All we need to do is change the setting used to create `UserManager`.

Add configuration import 
 
```jsx
 import { githubConfig } from '../utils/config';
```

And then change this line 
 
```jsx
const userManager = new UserManager(githubConfig.settings);
```


<br>

### **Update [services/Api.js](https://github.com/andreyka26-git/andreyka26-authorizations/blob/main/OAuthAndOpenIdConnect/OAuth.Github.WebClient/src/services/Api.js)**

We should add additional function that will query Github API with the token we have obtained:


```jsx
export async function getGithubResources(token) {
  const url = 'https://api.github.com/user/repos';

  const options = {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };

  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }

    const data = await response.json();
    return data.map(d => d.name).join(', ');
  } catch (error) {
    console.error('There was an error fetching the data', error);
  }
}
```

 
In this call we are going to use


<br>

### **Update [pages/unauthenticated.page.js](https://github.com/andreyka26-git/andreyka26-authorizations/blob/main/OAuthAndOpenIdConnect/OAuth.Github.WebClient/src/pages/unauthenticated.page.js)**

Just cosmetic change to understand what do we authorize with:

```jsx
 <button onClick={sendOAuthRequest}>Login via github</button>
```


<br>

### **Update [App.js](https://github.com/andreyka26-git/andreyka26-authorizations/blob/main/OAuthAndOpenIdConnect/OAuth.Github.WebClient/src/App.js)**

Here instead of getting data from our Resource Server in OpenIddict setup (because our Resource Server cannot validate github tokens) we will query repository data from Github API:

```jsx
import { getGithubResources } from './services/Api';

const data = await getGithubResources(accessToken);
```


<br>

### **Update [AuthService.js](https://github.com/andreyka26-git/andreyka26-authorizations/blob/main/OAuthAndOpenIdConnect/OAuth.Github.WebClient/src/services/AuthService.js)**

Since we don’t have end_session_endpoint as was explained above. 
We need to patch our logout function:

```jsx
export async function logout() {
    await userManager.clearStaleState();

    try {
        await userManager.signoutRedirect();
    } catch (e) {
        console.log('error on signoutRedirect', e);
        window.location.href = '/';
    }
}
```

`signoutRedirect` would fail since UserManager does not have end_session_endpoint. 
 
So we cannot log out user on the Github side, but still we will drop all local state about authentication by calling `await userManager.clearStaleState();`


<br>

## **How to obtain Github Creds (client_id, client_secret)**

First sign in to your Github account. 
 
Then click on your avatar on the right side of the screen


[![alt_text](/assets/2024-01-23-oauth-authorization-code-react-client-pt2-github/image3.png "image_tooltip")](/assets/2024-01-23-oauth-authorization-code-react-client-pt2-github/image3.png "image_tooltip"){:target="_blank"}
 
 
Then click developer settings


[![alt_text](/assets/2024-01-23-oauth-authorization-code-react-client-pt2-github/image6.png "image_tooltip")](/assets/2024-01-23-oauth-authorization-code-react-client-pt2-github/image6.png "image_tooltip"){:target="_blank"}


If you don’t have any Github OAuth Apps - click `New OAuth App`, and follow instructions to create it.


<br>

### **Create OAuth App**
 

[![alt_text](/assets/2024-01-23-oauth-authorization-code-react-client-pt2-github/image4.png "image_tooltip")](/assets/2024-01-23-oauth-authorization-code-react-client-pt2-github/image4.png "image_tooltip"){:target="_blank"}


The important part of Github OAuth app is to have the Callback URL set to `[http://localhost:3000/oauth/callback](http://localhost:3000/oauth/callback)`. 
 

[![alt_text](/assets/2024-01-23-oauth-authorization-code-react-client-pt2-github/image1.png "image_tooltip")](/assets/2024-01-23-oauth-authorization-code-react-client-pt2-github/image1.png "image_tooltip"){:target="_blank"}
 

<br>

### **Obtain client id and secret**

You should already see `Client ID`. 
 
Then click `Generate a new client secret` to create a secret to your app.


[![alt_text](/assets/2024-01-23-oauth-authorization-code-react-client-pt2-github/image2.png "image_tooltip")](/assets/2024-01-23-oauth-authorization-code-react-client-pt2-github/image2.png "image_tooltip"){:target="_blank"}



<br>

## **Github Auth Problems**

<br>


### **Github does not have OIDC Discovery endpoint**

Github OpenId Connect provider DOES NOT implement [OIDC Discovery endpoint](https://openid.net/specs/openid-connect-discovery-1_0.html). At least it is not located under the default Discovery endpoint path: `.well-known/openid-configuration`. 
 
I think it is not compliant with OpenId Connect specification because:

Github is `Dynamic OpenID Provider`, since Client Registration (including our sample React Client) has dynamic nature, meaning Github didn’t know anything about existence until we registered in the `How to obtain Github Creds` section.

Based on the point above we could find [Dynamic OpenID Provider requirements](https://openid.net/specs/openid-connect-core-1_0.html#DynamicMTI): 

```
Mandatory to Implement Features for Dynamic OpenID Providers

Discovery

These OPs MUST support Discovery, as defined in OpenID Connect Discovery 1.0
```

This requirement is not fulfilled.

 
You could just remove the `metadata`  field in oidc-client-ts configuration and try to sign in with Github, you will see that it is failing on discovery endpoint. 
 
```jsx
const githubSettings = {
    authority: 'https://github.com/login/oauth/authorize',
    client_id: 'PUT_YOUR_CLIENT_ID_HERE',
    client_secret: 'PUT_YOUR_CLIENT_ID_HERE',
    redirect_uri: 'http://localhost:3000/oauth/callback',
    silent_redirect_uri: 'http://localhost:3000/oauth/callback',
    post_logout_redirect_uri: 'http://localhost:3000/',
    response_type: 'code'
    // this is for getting user.profile data, when open id connect is implemented
    scope: 'repo'
};
```


[![alt_text](/assets/2024-01-23-oauth-authorization-code-react-client-pt2-github/image9.png "image_tooltip")](/assets/2024-01-23-oauth-authorization-code-react-client-pt2-github/image9.png "image_tooltip"){:target="_blank"}


 
Talking about compliant providers - you could consider Google: 

[![alt_text](/assets/2024-01-23-oauth-authorization-code-react-client-pt2-github/image7.png "image_tooltip")](/assets/2024-01-23-oauth-authorization-code-react-client-pt2-github/image7.png "image_tooltip"){:target="_blank"}
 
 
<br>


### **Github does not have end_session_endpoint**

I searched tons of forums, stackoverflow, github, official doc, asked GPT, Copilot - but I didin’t find public Github OAuth/OIDC `end_session_endpoint`. 
 
According to [OpenId Connect official documentation](https://openid.net/specs/openid-connect-session-1_0-17.html#OPMetadata):  
 
```
end_session_endpoint

REQUIRED. URL at the OP to which an RP can perform a redirect to request that the End-User be logged out at the OP.
```

Since Github does not provide discovery endpoints (also not compliant) - there is no source from which we can obtain it. I tried to guess it - but all guesses led me to 404.

<br>

### **Cors issue with token endpoint**

In case you don’t set `githubSettings.metadata.token_endpoint` to `http://localhost:9999/https://github.com/login/oauth/access_token`, but rather to original github token endpoint ([https://github.com/login/oauth/access_token](http://localhost:9999/https://github.com/login/oauth/access_token)) you will get this error

"_Access to fetch at 'https://github.com/login/oauth/access_token' from origin 'http://localhost:3000' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource._"



[![alt_text](/assets/2024-01-23-oauth-authorization-code-react-client-pt2-github/image5.png "image_tooltip")](/assets/2024-01-23-oauth-authorization-code-react-client-pt2-github/image5.png "image_tooltip"){:target="_blank"}
 

[![alt_text](/assets/2024-01-23-oauth-authorization-code-react-client-pt2-github/image8.png "image_tooltip")](/assets/2024-01-23-oauth-authorization-code-react-client-pt2-github/image8.png "image_tooltip"){:target="_blank"}
 
 
There is well known issue with Github Authorization Server:

[https://github.com/isaacs/github/issues/330](https://github.com/isaacs/github/issues/330) 
[https://stackoverflow.com/questions/42150075/cors-issue-on-github-oauth](https://stackoverflow.com/questions/42150075/cors-issue-on-github-oauth) 
 
It just does not support Cross-Origin Resource Sharing headers.

<br>

#### **Workaround**


Since CORS errors might happen only in browsers for XHR/fetch requests - we can just call get tokens from the server, where CORS do not matter. 
 
There are 3 options:



* You write your own backend server that will take auth_code, client_id, client_secret and send request to `https://github.com/login/oauth/access_token` and return this token to React client.
* You use existing public one like `https://cors-anywhere.herokuapp.com/corsdemo` (I DO NOT RECOMMEND)
* You use cors-anywhere docker image, set up it to your environment and use it by your app only.

I went with the third option: we will use an existing proxy server implementation called [cors-anywhere](https://github.com/Rob--W/cors-anywhere). To not clone and run the app locally - let’s use a ready made [docker image](https://github.com/testcab/docker-cors-anywhere/tree/master). 


All you should do is: 


```
docker run -p 9999:8080 --name cors-anywhere -d testcab/cors-anywhere
```

It will run cors-anywhere on 9999 port locally on your docker.

<br>

## **Demo**

For the demo: 
- put your Github client_id to `PUT_YOUR_CLIENT_ID_HERE` and client_secret to `PUT_YOUR_CLIENT_SECRET_HERE`.
- start docker container for cors-anywhere (see `workaround`).
- start React application


Click `Login via github`

[![alt_text](/assets/2024-01-23-oauth-authorization-code-react-client-pt2-github/image10.png "image_tooltip")](/assets/2024-01-23-oauth-authorization-code-react-client-pt2-github/image10.png "image_tooltip"){:target="_blank"}

You will see in the network tab the same OAuth flow requests.

And you will see the call to github and my private repositories, which we were able to get with my access token.

[![alt_text](/assets/2024-01-23-oauth-authorization-code-react-client-pt2-github/image11.png "image_tooltip")](/assets/2024-01-23-oauth-authorization-code-react-client-pt2-github/image11.png "image_tooltip"){:target="_blank"}

<br>

## **Conclusion**

As you might see, the Github OAuth/OpenId Connect implementation misses a lot of necessary functionality, so I would say it is not compliant. However in this article we were able to overcome all auth problems with Github: discovery endpoint missing, logout endpoint missing, CORS problem with token obtaining, etc. 

As a result we were successfully authenticated to Github, obtained a token and called Github API to get all the public/private repos with the access token.

Please feel free to check my projects:
[Symptom Diary](https://blog.symptom-diary.com)
[Pet 4 Pet](https://pet-4-pet.com)