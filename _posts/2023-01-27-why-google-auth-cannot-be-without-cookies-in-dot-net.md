---
layout: post
title: "Why google auth cannot be without cookies in .NET"
date: 2023-01-27 11:02:35 -0000
category: [".NET Auth Internals"]
tags: [authorization]
description: "This article is focused on understanding .AddGoogle() and .AddCookies(), why we cannot use Google authorization and authentication without Cookies. Why we cannot rely on OAuth flow from Google and we need application Cookies. We will review answers from software engineers that develop .NET language. They are developers of Google Auth"
thumbnail: /assets/2023-01-27-why-google-auth-cannot-be-without-cookies-in-dot-net/logo.png
thumbnailwide: /assets/2023-01-27-why-google-auth-cannot-be-without-cookies-in-dot-net/logo-wide.png
---

* TOC
{:toc}


<!-- Output copied to clipboard! -->

<!-----

You have some errors, warnings, or alerts. If you are using reckless mode, turn it off to see inline alerts.
* ERRORs: 0
* WARNINGs: 0
* ALERTS: 13

Conversion time: 3.604 seconds.


Using this Markdown file:

1. Paste this output into your source file.
2. See the notes and action items below regarding this conversion run.
3. Check the rendered output (headings, lists, code blocks, tables) for proper
   formatting and use a linkchecker before you publish this page.

Conversion notes:

* Docs to Markdown version 1.0β34
* Sat Jan 28 2023 11:08:09 GMT-0800 (PST)
* Source doc: Why google auth cannot be without cookies
* This document has images: check for >>>>>  gd2md-html alert:  inline image link in generated source and store images to your server. NOTE: Images in exported zip file from Google Docs may not appear in  the same order as they do in your doc. Please check the images!

----->



## **Introduction**

In this article, we are going to get answers from the guys developing .NET right now. Since I am working at Microsoft I can just directly ask them inside Teams for what I am really proud of and appreciate.

Every time I need to use Google auth in .NET I encounter unknown spots that are not documented. For example, in [docs and tutorials ](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/social/social-without-identity?view=aspnetcore-7.0)`.AddGoogle()` is always used with `.AddCookies()`. However Google works through `OAuth ` protocol with its `own cookies`, so I always wondered why we need .NET cookies on top of it at all?


## **Why .AddGoogle() cannot be without .AddCookies()**


### **RemoteAuthenticationOptions**

[RemoteAuthenticationOptions source code](https://github.com/dotnet/aspnetcore/blob/main/src/Security/Authentication/Core/src/RemoteAuthenticationOptions.cs)

`RemoteAuthenticationOptions` contains different things for OAuth protocol: HttpClient to communicate to identity provider, data protection provider, callback path, return url, etc.

On top of that it contains **SignInScheme** [here](https://github.com/dotnet/aspnetcore/blob/4535ea1263e9a24ca8d37b7266797fe1563b8b12/src/Security/Authentication/Core/src/RemoteAuthenticationOptions.cs#L112)


[![alt_text](/assets/2023-01-27-why-google-auth-cannot-be-without-cookies-in-dot-net/image8.png "image_tooltip")](/assets/2023-01-27-why-google-auth-cannot-be-without-cookies-in-dot-net/image8.png "image_tooltip"){:target="_blank"}


As you can see from the comments, it is **DIFFERENT** scheme from Remote Scheme (Google, Github, Facebook) that is used to persist user identity after authentication. 

In other words, it saves user identity somewhere on side of your application to NOT trigger `OAuth` flow every time. Usually, it is a `Cookies` scheme, because once the cookies are set - they carry auth info with each request by the browser.

[RemoteAuthenticationOptions](https://github.com/dotnet/aspnetcore/blob/main/src/Security/Authentication/Core/src/RemoteAuthenticationOptions.cs) contain validate method that ensures that `SignInSheme` is not the same as `RemoteScheme (current)` [here](https://github.com/dotnet/aspnetcore/blob/4535ea1263e9a24ca8d37b7266797fe1563b8b12/src/Security/Authentication/Core/src/RemoteAuthenticationOptions.cs#L41)


[![alt_text](/assets/2023-01-27-why-google-auth-cannot-be-without-cookies-in-dot-net/image2.png "image_tooltip")](/assets/2023-01-27-why-google-auth-cannot-be-without-cookies-in-dot-net/image2.png "image_tooltip"){:target="_blank"}


**41nd line**: this validation is happening. If our `SignInScheme` is the same as `sheme` (that is `GoogleScheme`) then we are throwing `RemoteSignInSchemeCannotBeSelf`).


### **Possible alternatives**

As explained above it turns out that **ANY** remote scheme including `Facebook`,`Google`, `Github` cannot be used as `SignInScheme`. 

`Google Scheme` uses `OAuth protocol`. Under the hood, it performs the whole OAuth process if you are not signed in to Google already (asking for login and password, etc). Then it sets Google Cookies into your browser.

Starting from that point any time a new OAuth process is initiated Google Authorization, the Server will check cookies and return Access/Identity tokens straight away.

It seems like Google cookies are enough for the use case, isn’t it?


### **1. Verify Access / Id tokens returned from Google**

Since inside the handler we have access to Id and Access tokens - we might save them and call some validation endpoint on Google Side, or in case of Google I have heard about this [library](https://stackoverflow.com/questions/44141439/validate-google-id-token-with-c-sharp) provided by Google to validate the token.

The problem here is that not all Remote Schemes allow you to validate tokens, so you end up doing some hacks like sending some test requests with this token to Server to check whether you still don’t get 401.


### **2. Init OAuth process every time**

When OAuth flow is happening most of the **Authorization Servers save cookies** in the browser to not do the Authentication process again (login & password checking). So, the second time you initiate OAuth process - Google Authorization Server will just check cookies and return you Access / Id tokens.

It seems like a relatively inexpensive operation, especially considering most Remote Providers are doing the same way. 

For example, try to investigate **Github** request in the network tab to get your repositories. You will see cookies with the user session going to the request, without the Authorization header. So, why not?


[![alt_text](/assets/2023-01-27-why-google-auth-cannot-be-without-cookies-in-dot-net/image11.png "image_tooltip")](/assets/2023-01-27-why-google-auth-cannot-be-without-cookies-in-dot-net/image11.png "image_tooltip"){:target="_blank"}


**Actual solution**

But all workarounds encounter one problem - `generalizability`. Different remote authentication providers work in different ways, so the easiest and cheapest way - is to `preserve auth info on your application side`.

By doing this:

- you will trigger OAuth flow **only once**, and every time your own cookies are expired or revoked - you will initiate OAuth flow one more time. Since the cookies of the Remote Authentication provider could be valid and it still will not prompt the user login and password.

- you do not care much about different implementations of OAuth (encrypted tokens or not, verifiable tokens or not, etc). You just emit OAuth flow according to protocol, get opaque for your tokens, try to grab claims (user data), and save your own cookies.


## **.NET Developers answers**

Considering my thoughts above - I would like to get some confirmation of my guesses. I would like to know that there is no secret reason that made them use cookies and not emit OAuth every time for example.

I just went to [aspnetcore repo](https://github.com/dotnet/aspnetcore) and searched through the developers. Then I searched them in my teams and MAGIC - I found them. Not all of them answered me, but a few of these really smart guys did.

This is what I got:


### **Answer from [HaoK](https://github.com/HaoK):**

 


[![alt_text](/assets/2023-01-27-why-google-auth-cannot-be-without-cookies-in-dot-net/image9.png "image_tooltip")](/assets/2023-01-27-why-google-auth-cannot-be-without-cookies-in-dot-net/image9.png "image_tooltip"){:target="_blank"}



### **Answer from [Tratcher](https://github.com/Tratcher):**


[![alt_text](/assets/2023-01-27-why-google-auth-cannot-be-without-cookies-in-dot-net/image6.png "image_tooltip")](/assets/2023-01-27-why-google-auth-cannot-be-without-cookies-in-dot-net/image6.png "image_tooltip"){:target="_blank"}



[![alt_text](/assets/2023-01-27-why-google-auth-cannot-be-without-cookies-in-dot-net/image10.png "image_tooltip")](/assets/2023-01-27-why-google-auth-cannot-be-without-cookies-in-dot-net/image10.png "image_tooltip"){:target="_blank"}



## **Demo**

Demo is run from [this repo](https://github.com/andreyka26-git/andreyka26-authorizations/tree/main/SimpleAuth/Cookie.Google.Server).

This is simple .NET application with Razor Pages. We have added `Google` and `Cookies` to demonstrate how they work together [here](https://github.com/andreyka26-git/andreyka26-authorizations/tree/main/SimpleAuth/Cookie.Google.Server/Program.cs#L6).


[![alt_text](/assets/2023-01-27-why-google-auth-cannot-be-without-cookies-in-dot-net/image12.png "image_tooltip")](/assets/2023-01-27-why-google-auth-cannot-be-without-cookies-in-dot-net/image12.png "image_tooltip"){:target="_blank"}


We have 1 private endpoint that is under [Authorize] attribute [here](https://github.com/andreyka26-git/andreyka26-authorizations/tree/main/SimpleAuth/Cookie.Google.Server/Pages/Secret/Index.cshtml.cs#L8).


[![alt_text](/assets/2023-01-27-why-google-auth-cannot-be-without-cookies-in-dot-net/image4.png "image_tooltip")](/assets/2023-01-27-why-google-auth-cannot-be-without-cookies-in-dot-net/image4.png "image_tooltip"){:target="_blank"}


Lets try to access Secret page


[![alt_text](/assets/2023-01-27-why-google-auth-cannot-be-without-cookies-in-dot-net/image1.png "image_tooltip")](/assets/2023-01-27-why-google-auth-cannot-be-without-cookies-in-dot-net/image1.png "image_tooltip"){:target="_blank"}


Response from request page was `302` with `location` header that points to Google authorize endpoint.

As you might know from my [previous article](https://andreyka26.com/auth-from-backend-perspective-pt3-oauth-basics) about OAuth this is the `Authorization Code grant` endpoint, the most secure one.

In  your browser  you should see the Google Login page


[![alt_text](/assets/2023-01-27-why-google-auth-cannot-be-without-cookies-in-dot-net/image13.png "image_tooltip")](/assets/2023-01-27-why-google-auth-cannot-be-without-cookies-in-dot-net/image13.png "image_tooltip"){:target="_blank"}


If your browser contains Google cookies already, meaning that you are already logged in somewhere in Google Services - then your Authorization Middleware (`.AddGoogle()`) will set your application cookies.


[![alt_text](/assets/2023-01-27-why-google-auth-cannot-be-without-cookies-in-dot-net/image7.png "image_tooltip")](/assets/2023-01-27-why-google-auth-cannot-be-without-cookies-in-dot-net/image7.png "image_tooltip"){:target="_blank"}


In the screen above you see Authorization Callback to your `Return Url` with Authorization Code which will be exchanged to get token.

After we got Access Token, Authorization Middleware will do the request to Google to get user claims and call `Context.SignInAsync` with those claims to set Cookies for our Server (localhost:7000).

To understand Google Auth inside .NET - you could read [this article](https://andreyka26.com/dot-net-auth-internals-pt3-google).


[![alt_text](/assets/2023-01-27-why-google-auth-cannot-be-without-cookies-in-dot-net/image5.png "image_tooltip")](/assets/2023-01-27-why-google-auth-cannot-be-without-cookies-in-dot-net/image5.png "image_tooltip"){:target="_blank"}


Our `locahost:7000/signin-google` endpoint redirects us to our initial `/secret` endpoint where we have Cookies set. With those cookies, we can be Authorized and get User Claims that we got from the Google endpoint.


[![alt_text](/assets/2023-01-27-why-google-auth-cannot-be-without-cookies-in-dot-net/image3.png "image_tooltip")](/assets/2023-01-27-why-google-auth-cannot-be-without-cookies-in-dot-net/image3.png "image_tooltip"){:target="_blank"}



## **Conclusion**

So overall it is NOT allowed to use `.AddGoogle()` without `.AddCookies()` because


1. It provides extra overhead of calling OAuth provider each time, 
2. As stated in [this article](https://andreyka26.com/dot-net-auth-internals-pt3-google), Remote Auth handlers don’t have `.SignInAsync()` but each of those handlers calls `Context.SignInAsync()` [here](https://github.com/dotnet/aspnetcore/blob/4535ea1263e9a24ca8d37b7266797fe1563b8b12/src/Security/Authentication/Core/src/RemoteAuthenticationHandler.cs#L162) and rely on another Auth Scheme registered for signing principal in. Basically, the code will fail or enter indefinite recursion.

 To do so we need to write our own AuthorizationHandler with all supportive classes, and each time the user is not authorized - just emit OAuth flow.

Please subscribe to my social media to not miss updates.: [Instagram](https://www.instagram.com/andreyka26_se), [Telegram](https://t.me/programming_space)

I’m talking about life as a Software Engineer at Microsoft.

<br>

Besides that, my projects:

Symptoms Diary: [https://blog.symptom-diary.com](https://blog.symptom-diary.com)

Pet4Pet: [https://pet-4-pet.com](https://pet-4-pet.com)