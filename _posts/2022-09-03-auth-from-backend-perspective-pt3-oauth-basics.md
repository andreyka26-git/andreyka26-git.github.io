---
layout: post
title: "Auth from backend perspective pt3: OAuth basics"
date: 2022-09-03 11:02:35 -0000
category: ["Auth from backend perspective"]
tags: [guides, authorization, dotnet, tutorials]
description: "In this article we will discuss OAuth protocol basics, all 4 Authorization grant types: Authorization Code, Implicit, Resource Owner Password Credentials, and Client Credentials, how they work, explain how to use it. In the end we will do demo with integrating with GitHub by using GitHub's OAuth protocol and getting github profile."
thumbnail: /assets/2022-09-03-auth-from-backend-perspective-pt3-oauth-basics/logo.png
thumbnailwide: /assets/2022-09-03-auth-from-backend-perspective-pt3-oauth-basics/logo-wide.png
---

* TOC
{:toc}


<!-- Output copied to clipboard! -->

<!-----

You have some errors, warnings, or alerts. If you are using reckless mode, turn it off to see inline alerts.
* ERRORs: 0
* WARNINGs: 0
* ALERTS: 15

Conversion time: 3.439 seconds.


Using this Markdown file:

1. Paste this output into your source file.
2. See the notes and action items below regarding this conversion run.
3. Check the rendered output (headings, lists, code blocks, tables) for proper
   formatting and use a linkchecker before you publish this page.

Conversion notes:

* Docs to Markdown version 1.0β33
* Fri Nov 25 2022 16:19:47 GMT-0800 (PST)
* Source doc: Authorization & Authentication from backend perspective pt2: OAuth basics
* This document has images: check for >>>>>  gd2md-html alert:  inline image link in generated source and store images to your server. NOTE: Images in exported zip file from Google Docs may not appear in  the same order as they do in your doc. Please check the images!

----->


## **Why you may want to read this article**

`Attention!` This article is about definitions and abstract understanding and flow of OAuth for those who struggle with RFC understanding. The concrete flows with implementation (Authorization Code, Client Credentials, etc) will be discussed in subsequent articles.

For better understanding - you could go to my [previous article](https://andreyka26.com/auth-from-backend-percpective-pt1-basics) for definitions and basic flows of auth that were discussed.

During the article, the main source of information is my experience +  [official RFC](https://www.rfc-editor.org/rfc/rfc6749)

This topic is one of the hardest for understanding. After 3 projects that were using `OAuth` + `OpenId Connect`, after researching `.NET Core source code`, etc eventually I got some understanding. 

This article is addressed to me in the past. I’ll show the easy and simple way to understand OAuth, on top of that we will implement OAuth flow on our own: Resource Server + Authorization Server + Client in the subsequent articles.


<br>

## **Definitions and Terms**

Server - the piece of software running on some hardware. In the scope of this article, this software should be able to receive requests and respond to them via HTTP protocol.

`Authentication` - [from basics article](https://andreyka26.com/auth-from-backend-percpective-pt1-basics#authorization--authentication)

`Authorization` - [from basics article](https://andreyka26.com/auth-from-backend-percpective-pt1-basics#authorization--authentication)

As explained in the article above we will use `auth` term most of the time referring to `authentication` & `authorization`.

`Resource Owner` - the user that has access to **Resource Server**.

`Resource Server` - the server that is hosting and serving protected resources. In scope of the article, this server should be able to verify Access Token and decide what resources the **Client** has access to.

`Authorization Server` - the server authenticates **Resource Server** and issues Access Tokens to be used by **Client**. It could exchange Refresh Tokens for Access Tokens.

By the OAuth specification, the communication between **Authorization Server** and **Resource Server** is not mentioned. They could be different servers, they could be 2 entities inside one server.

`Client` - the application that communicates with **Resource Server** and **Authorization Server** on behalf of **Resource Server**. It could be Mobile, Desktop, and Web Applications..

`Third-party application` - the application which is isolated from **Resource Server**, typically developed by another team in another scope,  but in our case wants to use Resource Server API.
 

`User Agent` - almost always it is browser, [as mentioned in rfc](https://www.rfc-editor.org/rfc/rfc2616#section-1.3) 

`Authorization Grant` - **Client** ’s credential that **Client** will exchange with **Authorization Server** to get an Access Token. Since there are 4 flows of OAuth protocol there are 4 Authorization Grants.

`Access Token` - the credential (a string of symbols usually) used to access protected resource. **Resource Server** should be able to verify them.

`Refresh Token` - the credential used to obtain Access Token without initiating full OAuth flow again.

Giving more real-world examples:

We have a `third-party` mobile application (or web) that communicates to Google Calendar API.

The user (`Resource Owner`) is making or following OAuth protocol by authenticating itself in Google (`Authorization Server`). After Google verifies the user (`Resource Owner`) it provides the mobile application (`Client`) an Access Token.

The user (`Resource Owner`) then sends the request to Google Calendar API (`Resource Server`) with Access Token via mobile application (`Client`) to interact with protected resources (Google Calendar data like events, tasks, reminders, etc).

Example from RFC:

“ _For example, an end-user (resource owner) can grant a printing_
_service (client) access to her protected photos stored at a photo-_
_sharing service (resource server), without sharing her username and_
_password with the printing service.  Instead, she authenticates_
_directly with a server trusted by the photo-sharing service_
_(authorization server), which issues the printing service delegation-_
_specific credentials (access token)_”


<br>

## **Purpose**

Historically the main use case for OAuth was solving auth problems that come up with third-party applications.

So, imagine we have developed a photo storage web application. There is a user (`Resource Owner`) and photo storage (`Resource Server`). `Resource Owner` can directly access `Resource Server` by authenticating let’s say by username + password.

Now some third-party applications, developed by other guys would like to use photo storage.

They have NO choice other than just to get a username + password from Resource Owner and use those credentials to interact with photo storage.

This brings some problems: 



* Most probably for convenience third-party applications store credentials (e.g. username + password)
* Servers are required to support credentials authentication (to use them in Resource Server authentication)
* The resource server has access to Resource Owner credentials, so Resource Owner has no control over it, he cannot revoke access.
* Compromising credentials in one third-party application - leads to compromising those credentials in all apps that used those.

OAuth was introduced to address those problems. It uses separate credentials for third-party apps rather than Resource Owner’s credentials. Those Client credentials will be exchanged in some way with the Authorization Server for Access Token, during that process Resource Owner will grant necessary permissions for the Client. The Client then will make all requests with this Access Token.


<br>

## **Flow**

The first thing that brings you close to understanding `OAuth` is that `it is not a protocol for authentication`. So it does not explain how you can authenticate users with login & password or any other way. 

The OAuth is about using first-party applications that already have authentication mechanisms in place by other third-party applications. Mainly you will use this when you would like to use data of the user that is inside a first-party application by your third-party application.

Later on with OpenId Connect borning it became closer to authentication itself on top of OAuth.

Generally, we have the following use case: there is Resource Owner who wants to use some Client (third party) that required Resources from Resource Server.

The `general flow`: 



* The `Resource Owner` wants to use `Client` (third-party) and starts interacting with it. The `client` needs Resource from `Resource Server`.
* The `Client` redirects to `Authorization Server` to authenticate the `Resource Owner`
* Once `Resource Owner` is authenticated the `Authorization Server` sends Access Token to `Client`.
* The `Client` performs operations with Resources using Access Token


<br>

## **Authorization Grants & Flow**

There are 4 main flows and consequently 4 Authorization Grants for OAuth protocol: `Authorization Code`, `Implicit`,  `Resource Owner Password Credentials`, and `Client Credentials`.

They differ in security guarantees, performance implications, and amount of actors (e.g. Client Credentials does not have Resource Owner in place).

I personally differentiate the flows by



* `Browserfull` (Authorization Code and Implicit). They require Client to be able to use Browser (User Agent).
* `Browserless` (Resource Owner Password Credentials and Client Credentials). They don’t require to use Browser and could be used from servers using plain HTTP.


<br>

### **Authorization Code**

One of the safest grant types. Canonically required browser (user agent according to specification).

To make a better separation of concepts, let’s say, that the Client in our case is a mobile app. Because the first time I was discovering OAuth I didn’t understand the separation between `User Agent` and `Client`.

Basically, the flow is the following: 


[![alt_text](/assets/2022-09-03-auth-from-backend-perspective-pt3-oauth-basics/image15.png "image_tooltip")](/assets/2022-09-03-auth-from-backend-perspective-pt3-oauth-basics/image15.png "image_tooltip"){:target="_blank"}




1. The `Resource Owner` goes to the third-party application (`Client`) and initiates some operation that needs `Resource Server` data.
2. The `Client` initiates `Resource Owner` authentication: it directs `Resource Owner` to `Authorization Server’s` login page via browser. By doing this the `Client` authenticates itself (not `Resource Owner`) with the `Authorization Server`.
3. The `Resource Owner` authenticates with the `Authorization Server` usually with login and password, and also he grants access to Resources for the `Client`.
4. The `Authorization Server` redirects `Resource Owner` (which is in the browser now) to the `Client` with `Authorization Code` via mobile deep linking. If it is a browser - then it redirects to the web app (browser as well).
5. The `Client` makes a request to exchange the `Authorization Code` for `Access Token`.
6. The `Client` makes a request to `Resource Server` with Access Token to get data on behalf of the `Resource Owner`.


<br>

### **Implicit**

Implicit flow is basically the same as Authorization Code, except it does not authenticate the Client, it only authenticates Resource Owner. This implies some Security drawbacks against Authorization Code flow. 


[![alt_text](/assets/2022-09-03-auth-from-backend-perspective-pt3-oauth-basics/image11.png "image_tooltip")](/assets/2022-09-03-auth-from-backend-perspective-pt3-oauth-basics/image11.png "image_tooltip"){:target="_blank"}




1. The `Resource Owner` goes to the third-party application (`Client`) and initiates some operation that needs Resource Server data.
2. The `Client` initiates `Resource Owner` authentication: it directs `Resource Owner` to `Authorization Server’s` login page via browser. By doing this the `Client` authenticates itself (not `Resource Owner`) with the `Authorization Server`.
3. The `Resource Owner` authenticates with the `Authorization Server` usually with login and password, and also he grants access to Resources for the `Client`.
4. The `Authorization Server` redirects `Resource Owner` (which is in the browser now) to the `Client` with `Access Token` via mobile deep linking. If it is a browser - then it redirects to the web app (browser as well).
5. The `Client` makes a request to Resource Server with `Access Token` to get data on behalf of the `Resource Owner`.


<br>

### **Resource Owner Password Credentials**

The simplest and weakest from a security standpoint flow.

The `Client` gets the `Resource Owner’s` credentials and authenticates him with the `Authorization Server`. The `Authorization Server` returns Access Token in that case. 

Good question what this flow solves in the first place? 

The client has access to Resource Owner’s credentials. But this flow allows the Client to not remember credentials. It uses credentials only once per user session to get Access Token.

On top of that, this is a good flow if you are migrating Clients from Basic or Digest authentication to OAuth.


[![alt_text](/assets/2022-09-03-auth-from-backend-perspective-pt3-oauth-basics/image1.png "image_tooltip")](/assets/2022-09-03-auth-from-backend-perspective-pt3-oauth-basics/image1.png "image_tooltip"){:target="_blank"}




1. The `Resource Owner` goes to the third-party application (`Client`) and initiates some operation that needs `Resource Server` data
2. The Client sends `Resource Owner’s` credentials via HTTP (without the need of a browser). As a response, it receives Access Token.
3. The Client makes a request to `Resource Server` with `Access Token` to get data on behalf of the `Resource Owner`.


<br>

### **Client Credentials**

This flow is used usually without Resource Owner, or where the `Client is Resource Owner`.

The Client authenticates itself with the Client’s credentials with the Authorization Server. The Authorization Server gives the Client the Access Token that is used to interact with Resource Server.

This flow should ONLY be used for Confidential Clients (not web-based applications and not mobile-based applications). Mostly it means the usage of Server2Server communication with HTTP-only interaction.


[![alt_text](/assets/2022-09-03-auth-from-backend-perspective-pt3-oauth-basics/image3.png "image_tooltip")](/assets/2022-09-03-auth-from-backend-perspective-pt3-oauth-basics/image3.png "image_tooltip"){:target="_blank"}




1. The `client` authenticates itself with the `Authorization Server`. Usually, it is Basic authentication with client credentials (client id + client password). It receives Access Token in response.
2. The `Client` makes a request to `Resource Server` with Access Token to get data.


<br>

## **Endpoints**


<br>

### **Authorize Endpoint**

The endpoint is implemented in Authorization Server.

This endpoint should authenticate Resource Owner. After this, its behavior depends on Authorization Grant (Flow)

From RFC: 


“_`The authorization endpoint is used to interact with the resource`_

_`owner and obtain an authorization grant.  The authorization server`_

_`MUST first verify the identity of the resource owner.  The way in`_

_`which the authorization server authenticates the resource owner`_

_`(e.g., username and password login, session cookies) is beyond the`_

_`scope of this specification.`_”

This endpoint is only used by the `Authorization Code` and `Implicit` grant types. For Resource Owner Password Credentials and Client Credentials the Token Endpoint is used directly.


<br>

### **Redirect Endpoint**

The endpoint is implemented in Client.

This is the endpoint on the Client where Authorization Server redirects the user after authentication.

This endpoint MUST be registered in OAuth provider, to be validated when redirection is performed. Otherwise, it is vulnerable to an Open Redirection attack, when an attacker can set up a redirect endpoint to its own and get sensitive information.


<br>

### **Token Endpoint**

The endpoint is implemented in Authorization Server.

This endpoint is used by Client to get an Access Token. 


<br>

## **Access & Refresh Tokens**

The `Authorization Token` could be some identifier for authorization information that will be retrieved, or it could be a self-containing verifiable pack of data (data + signature). Most usually we mean Bearer tokens.

The `Refresh Token` is a token that the Client could exchange to renew an expired Access Token.


<br>

## **DEMO**

For this demo: 

My application is a third-party app (web application), and we can name it the `Client`. I think we even can name my PC as my Client from a device standpoint, it does not matter much.

I - am `Resource Owner`, because I have an account in GitHub and some data I would like to interact with through my client (my application).

GitHub API - is `Resource Server` that contains profile data I would like to have access to.

GitHub itself - is `Authorization Server`. I mean not the whole GitHub, but you will see  Authorization requests that go to the GitHub domain.

In this demo, I will demonstrate the Authorization Code flow with Github. you could see [Github source code](https://github.com/andreyka26-git/andreyka26-authorizations/tree/main/Custom/OAuth.Custom.Github.WebClient)

Steps of registering Client in Github are omitted - you easily can find them by googling.

Let’s launch the application.


[![alt_text](/assets/2022-09-03-auth-from-backend-perspective-pt3-oauth-basics/image5.png "image_tooltip")](/assets/2022-09-03-auth-from-backend-perspective-pt3-oauth-basics/image5.png "image_tooltip"){:target="_blank"}



<br>

### **Not Authenticated Resource Owner**

Open the browser in incognito mode.

Let’s click on “Authorize via Github“.

You should see now Github login page.

The first request here is Authorize Endpoint ([https://github.com/login/oauth/authorize](https://github.com/login/oauth/authorize)) request


[![alt_text](/assets/2022-09-03-auth-from-backend-perspective-pt3-oauth-basics/image9.png "image_tooltip")](/assets/2022-09-03-auth-from-backend-perspective-pt3-oauth-basics/image9.png "image_tooltip"){:target="_blank"}


We have sent `client_id`, `redirect_uri`, `scope` and `state`. The Authorization Server recognizes that we are not signed to GitHub now, so it returns a 302 Found status code with “location” header that points to the Authentication endpoint ([https://github.com/login](https://github.com/login)) in Github to authenticate the Resource Owner (me).

Login request returns us HTML of login page


[![alt_text](/assets/2022-09-03-auth-from-backend-perspective-pt3-oauth-basics/image8.png "image_tooltip")](/assets/2022-09-03-auth-from-backend-perspective-pt3-oauth-basics/image8.png "image_tooltip"){:target="_blank"}


We should authenticate (submit login & pass) then you will see [https://github.com/session](https://github.com/session) request that sends your credentials to GitHub’s Authorization Server.


[![alt_text](/assets/2022-09-03-auth-from-backend-perspective-pt3-oauth-basics/image7.png "image_tooltip")](/assets/2022-09-03-auth-from-backend-perspective-pt3-oauth-basics/image7.png "image_tooltip"){:target="_blank"}



[![alt_text](/assets/2022-09-03-auth-from-backend-perspective-pt3-oauth-basics/image10.png "image_tooltip")](/assets/2022-09-03-auth-from-backend-perspective-pt3-oauth-basics/image10.png "image_tooltip"){:target="_blank"}


After that “session” request, from “location” header it will redirect us to our Authorize Endpoint ([https://github.com/login/oauth/authorize](https://github.com/login/oauth/authorize)) again, but with authentication cookies this time.

Then it will send callback to our “redirect_uri” ([https://localhost:7000/signin-github](https://localhost:7000/signin-github)) with Authorize Code.


[![alt_text](/assets/2022-09-03-auth-from-backend-perspective-pt3-oauth-basics/image14.png "image_tooltip")](/assets/2022-09-03-auth-from-backend-perspective-pt3-oauth-basics/image14.png "image_tooltip"){:target="_blank"}



<br>

### **Already Authenticated Resource Owner**

Let’s launch our application inside the browser that already authenticated in GitHub account.

Click “Authorize via Github”

We will send the first request to Authorize Endpoint ([https://github.com/login/oauth/authorize](https://github.com/login/oauth/authorize)).


[![alt_text](/assets/2022-09-03-auth-from-backend-perspective-pt3-oauth-basics/image2.png "image_tooltip")](/assets/2022-09-03-auth-from-backend-perspective-pt3-oauth-basics/image2.png "image_tooltip"){:target="_blank"}
 
<br>

We got 302 Found status code with “location” that points to our “redirect_uri” ([https://localhost:7000/signin-github](https://localhost:7000/signin-github)) already. This is because we already have authentication cookies for GitHub in browser.


[![alt_text](/assets/2022-09-03-auth-from-backend-perspective-pt3-oauth-basics/image4.png "image_tooltip")](/assets/2022-09-03-auth-from-backend-perspective-pt3-oauth-basics/image4.png "image_tooltip"){:target="_blank"}



<br>

### **Use Access Token**

Then we handled callback (redirect_uri) ([https://localhost:7000/signin-github](https://localhost:7000/signin-github)) in our server: 

<br>

[![alt_text](/assets/2022-09-03-auth-from-backend-perspective-pt3-oauth-basics/image13.png "image_tooltip")](/assets/2022-09-03-auth-from-backend-perspective-pt3-oauth-basics/image13.png "image_tooltip"){:target="_blank"}


We got Authorization Code and State from the query parameters. 

Line 27: we sent a request to the Token endpoint to exchange Authorization Code for Access Token:


[![alt_text](/assets/2022-09-03-auth-from-backend-perspective-pt3-oauth-basics/image6.png "image_tooltip")](/assets/2022-09-03-auth-from-backend-perspective-pt3-oauth-basics/image6.png "image_tooltip"){:target="_blank"}


Line 36: we sent a request to GitHub API with Access Token to get user data

Then we just put the response from Github Api as a response to our callback (to show it in the browser).


[![alt_text](/assets/2022-09-03-auth-from-backend-perspective-pt3-oauth-basics/image12.png "image_tooltip")](/assets/2022-09-03-auth-from-backend-perspective-pt3-oauth-basics/image12.png "image_tooltip"){:target="_blank"}


Please subscribe to my social media to not miss updates.: [Instagram](https://www.instagram.com/andreyka26_se), [Telegram](https://t.me/programming_space)

I’m talking about life as a Software Engineer at Microsoft.

<br>

Besides that, my projects:

Symptoms Diary: [https://syncsymptom.com](https://syncsymptom.com)

Pet4Pet: [https://pet-4-pet.com](https://pet-4-pet.com)