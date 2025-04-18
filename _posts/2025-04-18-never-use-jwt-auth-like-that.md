---
layout: post
title: "Never use JWT auth like that"
date: 2025-04-17 12:37:19 -0000
category: Auth from backend perspective
tags: [auth, authorization]
description: "I have seen people advicing to implement JWT auth, using frontend client (react, flutter, vue, etc) and backend where client sends email + password to backend and receives JWT. This flow is bad, and should not be used in production, instead you need to implement OAuth or OIDC protocols. Today I will explain why"
thumbnail: /assets/2025-04-18-never-use-jwt-auth-like-that/logo.png
thumbnailwide: /assets/2025-04-18-never-use-jwt-auth-like-that/logo-wide.png
---

* TOC
{:toc}


<br>

## **Disclaimer**

Wait, wait, wait — don’t go away. Let me explain myself. JWT itself is a good mechanism, but the problem lies in the authorization flow that uses JWT.

I’m talking about clients (React, Angular, Flutter) that send a login and password to the backend and receive a JWT in response.


[![alt_text](/assets/2025-04-18-never-use-jwt-auth-like-that/image3.png "image_tooltip")](/assets/2025-04-18-never-use-jwt-auth-like-that/image3.png "image_tooltip"){:target="_blank"}


Today, we’ll discuss why this approach is insecure, not recommended, and what to use instead.



<br>

## **The problematic flow**

Before proceeding we should somehow name or classify this flow. Since OAuth and OpenIdConnect protocols are the leading protocols for authorization - we are going to use them.

I have already explained all the internals of the OAuth protocol, how it works and why in [one of my articles](https://andreyka26.com/auth-from-backend-perspective-pt3-oauth-basics), it would be great to read it as a prerequisite.

In general OAuth has 4 different “approaches” or “implementations” for authorization called grants. They have different purposes, and different security drawbacks.

For Resource Owner authorization (the end user) we have only 3 grants: **auth code**, **implicit**, **password credentials**.

The “login, password” -> JWT token flow that people are implementing everywhere is actually called `Resource Owner Password Credentials grant` or shortly `Password Credentials grant`.

If you are interested, how this flow is implemented under hood - please have a look at this [article](https://andreyka26.com/jwt-auth-using-dot-net-and-react), where I made this auth with .net backend and react as a client




<br>

## **Why Custom Password Credentials is bad**

Now that we’ve classified the flow and know that it’s actually the **Password Credentials OAuth Grant**, let’s look at what’s bad about it.

It works exactly the same as people usually implement it. The Client (browser or mobile) sends login + password over the network to the authorization server. Server checks that user with that credential exists and issues access token + refresh token (possibly).


[![alt_text](/assets/2025-04-18-never-use-jwt-auth-like-that/image7.png "image_tooltip")](/assets/2025-04-18-never-use-jwt-auth-like-that/image7.png "image_tooltip"){:target="_blank"}


The difference is that it follows the protocol, so it adds parameters like `grant_type` and `scope`. Besides that OAuth MAY have client authentication on top of resource owner (user) authentication.

Why is it bad?




<br>

### **User’s credentials exposure**

In [official RFC](https://datatracker.ietf.org/doc/html/rfc6749#section-10.7) it’s stated that the main problem is the exposure of Resource Owner’s (user’s) credentials to the client, where they can be read and used in any way. Now, the security of your credentials is tied to two systems instead of one: the client and the server.


[![alt_text](/assets/2025-04-18-never-use-jwt-auth-like-that/image4.png "image_tooltip")](/assets/2025-04-18-never-use-jwt-auth-like-that/image4.png "image_tooltip"){:target="_blank"}


Since OAuth initially was designed to handle “third party apps” access, it is not usually suitable for general use, when both client and server are your first party apps, basically.




<br>

### **Password Brute Force**

Since the client fires the request (XHR), it’s easy to perform a brute-force attack. To prevent this, you need rate limiting and similar protections.


[![alt_text](/assets/2025-04-18-never-use-jwt-auth-like-that/image5.png "image_tooltip")](/assets/2025-04-18-never-use-jwt-auth-like-that/image5.png "image_tooltip"){:target="_blank"}


With the Authorization Code flow, for example — where the login UI is hosted on the Authorization Server — you can simply add anti-forgery tokens and that’s it, because it’s done via a <form> submission instead of an XHR request.




<br>

### **No External Identity Providers (Google, Github, Microsoft)**

I’ve been in situations like this many times. First, the product team says, “Let’s implement email and password.” So you do it, everything works — great success! But suddenly, they want to add an external identity provider, like Google or GitHub authentication.

Now real fun starts.

The only good way to do it is on the server side. It can be done on the client as well, but then it will be hard, or sometimes impossible, to validate a third party identity token from the backend.

Now, to do it on server side - you need to implement Authorization Code grant from your Authorization Server (your backend) to Identity provider (Google). With a very tricky implementation to not lose the request:

 

[![alt_text](/assets/2025-04-18-never-use-jwt-auth-like-that/image2.png "image_tooltip")](/assets/2025-04-18-never-use-jwt-auth-like-that/image2.png "image_tooltip"){:target="_blank"}


This flow works, as it is in prod right now, but it is very insecure and looks like a big “hack” or “workaround”. It is so complicated, because the client has a different “origin” or domain where it is hosted.




<br>

### **Single Sign On is not possible**

Nativelly, OAuth or OIDC implementations are SSO by default, cause you can connect clients in 1 hour, and you have auth with all needed providers, and features like MFA ready in production.

For the custom Password Grant type - you need to implement it for every new client (login page, token logic, etc).


[![alt_text](/assets/2025-04-18-never-use-jwt-auth-like-that/image8.png "image_tooltip")](/assets/2025-04-18-never-use-jwt-auth-like-that/image8.png "image_tooltip"){:target="_blank"}





<br>

### **Does not support Multi Factor Auth (MFA)**

Here, I need to point out that this flow does not support MFA out of the box with Authorization Servers like Microsoft Entra, Google Auth, etc. However, **you can** implement it yourself.

The problem is that it’s not standardized, which introduces multiple security issues — you'd essentially be reinventing the wheel. Also, it involves communication between the client and the Authorization Server, whereas in a proper OAuth implementation, MFA is handled entirely on the Authorization Server’s side.

From [oauth.net](https://oauth.net/2/grant-types/password/):


[![alt_text](/assets/2025-04-18-never-use-jwt-auth-like-that/image6.png "image_tooltip")](/assets/2025-04-18-never-use-jwt-auth-like-that/image6.png "image_tooltip"){:target="_blank"}


And from [MSDN](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth-ropc): 

[![alt_text](/assets/2025-04-18-never-use-jwt-auth-like-that/image1.png "image_tooltip")](/assets/2025-04-18-never-use-jwt-auth-like-that/image1.png "image_tooltip"){:target="_blank"}





<br>

## **Conclusion**

As you can see, the Custom Password Credentials grant type has many drawbacks, starting from security and ending with scalability. 

However, it does not mean you should go and implement OAuth protocol as it will take you some time, and it is more complex. If you plan to use multiple clients (browser, mobile), and identity providers (Google, Facebook, Github, Microsoft) - then it might be a very good idea. Nowadays there are a bunch of SaaS products for that (Clerk, Duende, OpenIddict, Auth0), that let you configure OpenId Connect in a matter of hours + ready made OAuth Client libraries.

