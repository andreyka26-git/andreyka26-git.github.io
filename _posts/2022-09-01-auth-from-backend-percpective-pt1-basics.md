---
layout: post
title: "Auth from backend perspective pt1: basics"
date: 2022-09-01 11:02:35 -0000
category: ["Auth from backend perspective"]
tags: [authorization]
description: "In this article we are going to overview the most popular Authentication and Authorization schemes starting from Basic and Digest auth, finishing with OAuth and OpenId Connect. We will overview the general flow, how they work."
---

* TOC
{:toc}


<!-- Output copied to clipboard! -->

<!-----

Yay, no errors, warnings, or alerts!

Conversion time: 0.572 seconds.


Using this Markdown file:

1. Paste this output into your source file.
2. See the notes and action items below regarding this conversion run.
3. Check the rendered output (headings, lists, code blocks, tables) for proper
   formatting and use a linkchecker before you publish this page.

Conversion notes:

* Docs to Markdown version 1.0β34
* Sat Dec 31 2022 09:32:03 GMT-0800 (PST)
* Source doc: Auth from backend perspective pt1: basics
----->



## **Why you may want to read this article**

To be honest, I planned to write this set of articles about a year ago, because for a long time the `authentication & authorization` process was for me not so clear. I didn’t find any book or article which in simple words can show the whole picture of that process, especially digging into details.

So in that article, we are covering:


* What is auth
* What types of auth could be
* What is the general flow of auth
* In the latter parts we will implement and consider Basic, Digest, JWT-based, OAuth + OpenId Connect authorizations

This article should be useful for people who managed to get the RFC but didn’t get the completely `OAuth` flow. I am here to help you because I was in the same situation.

Note: I am using official info like RFC or the documentation provided by specific tools, so you can check everything by yourself if you want to. 

[Git repository with samples](https://github.com/andreyka26-git/dot-net-samples/tree/main/AuthorizationSample) 


<br>

## **Definitions**

Prior to starting to talk about different approaches to `authentication` and `authorization`, we should consider the definitions.


<br>

### **Authorization & Authentication**

From [Wikipedia](https://en.wikipedia.org/wiki/Authorization): “_`Authorization` is the function of specifying access rights/privileges to resources, which is related to general information security and computer security, and to access control in particular_”.

From [MSDN](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/?view=aspnetcore-7.0): “_`Authorization` is the process of determining whether a user has access to a resource. `Authentication` is the process of determining a user's identity_”.

From [Martin Fowler’s blog](https://martinfowler.com/articles/web-security-basics.html): “_`Authorization` defines whether a user is allowed to do something._
_`Authentication` confirms that the users are who they claim to be_”.

You could pick up whatever definition you like, they are basically the same.

I unite `Authorization & Authentication` to “`auth`” because most usually (and in examples, we’ll see that) - the `authorization` is impossible without `authentication`. If you don’t know who the User is - you cannot say what the `User` is allowed to do via `Client`.


<br>

### **API or Resource Server**

In terms of `OAuth` it is named “`Resource Server`”, but for simplicity let me put it in the following way: it is the `Server` (just a piece of software running on some machine) that handles requests from the `Client`.


<br>

### **Client**

The `Client` is basically a piece of software that talks to the` API` and needs to authorize requests (when the endpoints are not public). Most usually this software runs on some device (mobile, desktop, and browser). The `User` is interacting with the API using the `Client`.


<br>

### **User**

In terms of `OAuth` the `resource owner` - is most usually a person who would like to use the `Client` and the application itself.


<br>

### **Authorization Server**

This `Server` is fully responsible for the identity of the user, authentication, and creation of tokens. This enables you just to use some verification based on signatures (on `Resource Server`) and not worry about implementation details of authentication.

We will use this term in the next part for `OAuth` and `OpenId Connect`. For this part, it is not possible to decouple the `Authorization Server` from `Resource Server`. So I will refer to `API`, `Resource Server`, `Authorization Server,` or just `Server` as to the same thing in this part.


<br>

## **Flow**

The basic flow looks like that:

1.The `User` wants to interact with the application somehow, this makes the `Client` send and receive data from `API` back and forth. Since the `API` has protected endpoints - it requires the `Client` to authorize its requests and responds with 401 Not Authorized.

2.The `Client` then should first authenticate the user - make the request to the `Server` so that it confirms the `User` is who he claims to be. It may be the same `Server` where the `API` is serving or a standalone `Server`. 

Most usually authentication is performed by sending the login and password (some identity) of the `User` to the `Server` that responds with a ticket (sequence of characters, typically signed or encrypted, the `API` can validate). 

This ticket can be used to access the `API`. Most usually this ticket is either a token or cookies. Meanwhile, for sure, the `Server` should have information about this user (to be able to say this login + password does exist and what he has access to).

3.The `Client` performs a request to the `API` including the authorization ticket (either token or cookies) - and then it can get the response from it.

The most common approach for implementing `auth` is to use auth tokens in headers. For sure there are other ways like sessions. But the main advantage of tokens is that they are stateless: you are not required to make other requests prior to the current one to be authorized. You only need to use the appropriate token.

The token is kept via request headers in the following format: `Authorization: {auth scheme} {token value}`. 

Basically, the scheme means the way you can create or get your token and validate it, so let’s consider the most popular `auth` schemes.


<br>

## **Auth schemes**

Although we merged Authentication and Authorization terms together because most usually Auth schemes do not have a clear separation some of them do have. Let me provide examples.


<br>

### **Basic Authentication**

Covered in [this article](https://andreyka26.com/auth-from-backend-perspective-pt2-basic-digest)

The `Basic Authentication` Scheme should be considered mostly like an authentication scheme (not authorization). Whenever the Client sends a request to a protected resource it should include the user login and password in the header. Otherwise, it will receive 401.

This scheme should use `Resource Server` and `Authorization Server` as the same thing. So each request from the Client goes to Resource Server and it authenticates and returns a response to the Client back.

Basic Authentication has a resource-splitting mechanism called a realm, it is something similar called scope in terms of OAuth. But from the Client, you cannot specify it.


<br>

### **Digest Authentication**

Covered in [this article](https://andreyka26.com/auth-from-backend-perspective-pt2-basic-digest)

The `Digest Authentication` Scheme acts both as an authentication scheme and some kind of authorization protocol as well. The idea here is to use hash of user credentials + server secret for authenticating.

This scheme should use `Resource Server` and `Authorization Server` as the same thing. 

`Digest Authentication` has a realm as well that is in fact similar to scope in terms of OAuth. It could be specified from the Client side, so it has a better mechanism of scopes compared to the Basic.


<br>

### **OAuth**

Covered in [this article](https://andreyka26.com/auth-from-backend-perspective-pt3-oauth-basics)

`OAuth` is an Authorization protocol only, so it does not cover user authentication (how login and password are sent to the server and checked on its side). 

However important detail is that it cannot be without authentication still, you should have it implemented to use `OAuth`, but it is not covered in what way exactly.

`OAuth` has 4 main flows: `Authorization Code`, `Implicit`, `Resource Owner Password Credentials`, `Client Credentials`. They varying depending on your use case. You might need server-to-server authorization, client-server authorization, with use of browser or without, more secured, less secured.

This protocol has a clear separation of the Resource Server and Authorization Server. Though, you could implement it in a way that those sit in the same physical server and even port (application)

`OAuth` operates on cookies for authentication (usually) and access tokens for calling Resource Server.


<br>

### **OpenId Connect**

`OpenId Connect` is an Authentication protocol only. It does not cover authorization.

`OpenId Connect` uses OAuth. To put it simply, `OpenId Connect` provides Id Token along with Access Token, and this Id Token is used for user identity providing information about the User.

Since it is built on top of OAuth (that does not cover the flow of authentication itself), `OpenId Connect` also does not provide authentication flow, but it allows you to work with user identity and verify the user is who he claims to be.


<br>

### **Custom Schemes based on JWT**

The flow is typically the following: the `Client` authenticates the `User` with login + password and the `Authorization Server` returns Access Token as the response of Authentication. With that token, the `Client` can go and make subsequent requests to `Resource Server`.

This allows to have UI-less authentication, or in other words to make authentication UI implemented on the client, and do authentication and authorization as a Backend concept only.

Custom schemes resemble the simplified `Password Grant` type from `OAuth` protocol, but they do not include unnecessary details of OAuth making it less secure and reliable, but stay easier to implement.

Those act with JWT (access tokens) and maybe refresh tokens as OAuth does as well. 


<br>

## **Follow up**


There are [resources](https://www.iana.org/assignments/http-authschemes/http-authschemes.xhtml) where you can find all commonly used schemes and RFC documentation for each of them.

In the next articles, we will consider all auth schemes we have discussed above.
