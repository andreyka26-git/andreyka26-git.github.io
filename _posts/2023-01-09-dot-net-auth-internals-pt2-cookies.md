---
layout: post
title: ".NET Auth internals pt2: cookies"
date: 2023-01-09 11:02:35 -0000
category: [".NET Auth Internals"]
tags: [guides, authorization, dotnet, tutorials]
description: "This article will show you cookie authentication handler internal for .NET Core. We will cover everything that going on under hood by looking into the source code."
---

* TOC
{:toc}


<!-- Output copied to clipboard! -->

<!-----

You have some errors, warnings, or alerts. If you are using reckless mode, turn it off to see inline alerts.
* ERRORs: 0
* WARNINGs: 0
* ALERTS: 36

Conversion time: 6.973 seconds.


Using this Markdown file:

1. Paste this output into your source file.
2. See the notes and action items below regarding this conversion run.
3. Check the rendered output (headings, lists, code blocks, tables) for proper
   formatting and use a linkchecker before you publish this page.

Conversion notes:

* Docs to Markdown version 1.0β33
* Sat Aug 27 2022 08:34:22 GMT-0700 (PDT)
* Source doc: .NET Auth internals pt2: cookies
* This document has images: check for >>>>>  gd2md-html alert:  inline image link in generated source and store images to your server. NOTE: Images in exported zip file from Google Docs may not appear in  the same order as they do in your doc. Please check the images!

----->

## **Why you may want to read this article**

The prerequisite for this article is the [entry article](https://andreyka26.com/dot-net-auth-internals-pt1-basics) about common services for Auth in .NET

This is the second article about authentication internals in .NET 5. Here I’m going to go through the `source code` of the Authentication Core of .NET, by implementing authentication using `Cookies`.

We will overview the basic magic of cookie-based auth in .NET, whether it is stateless or stateful, how it works, and all the magic underhood. On top of that we will do demo in the end.

<br>

## **Cookie Authentication Handler**

It is a time to research how a particular `IAuthenticationHandler` implementation works. For now, we will take a look at cookies-based authentication.

<br>

### **AddCookie**

Regularly, we register the cookies authentication handler using this method [.AddCookie](https://github.com/dotnet/aspnetcore/blob/main/src/Security/Authentication/Cookies/src/CookieExtensions.cs#L25)

[![alt_text](/assets/2022-09-31-dot-net-auth-internals-pt2-cookies/image23.png "image_tooltip")](/assets/2022-09-31-dot-net-auth-internals-pt2-cookies/image23.png "image_tooltip")

All calls go to this method. 36-40 lines are registering configurations and 42 line registers the handler itself. `AddScheme` implementation is [here](https://github.com/dotnet/aspnetcore/blob/main/src/Security/Authentication/Core/src/AuthenticationBuilder.cs#L90)

But there is nothing interesting so let’s dive into `CookieAuthenticationHandler`. But before this, we also need to consider CookieAuthenticationOptions.

<br>

### **CookieAuthenticationOptions**

[CookieAuthenticationOptions source code](https://github.com/dotnet/aspnetcore/blob/main/src/Security/Authentication/Cookies/src/CookieAuthenticationOptions.cs)

We need to understand some implementation from it:

`CookieManager`

The cookie manager is used to provide cookies from requests and write them to responses.

[![alt_text](/assets/2022-09-31-dot-net-auth-internals-pt2-cookies/image10.png "image_tooltip")](/assets/2022-09-31-dot-net-auth-internals-pt2-cookies/image10.png "image_tooltip")

It is initialized [here](https://github.com/dotnet/aspnetcore/blob/main/src/Security/Authentication/Cookies/src/PostConfigureCookieAuthenticationOptions.cs)

[![alt_text](/assets/2022-09-31-dot-net-auth-internals-pt2-cookies/image5.png "image_tooltip")](/assets/2022-09-31-dot-net-auth-internals-pt2-cookies/image5.png "image_tooltip")

[ChunkingCookieManager](https://github.com/dotnet/aspnetcore/blob/main/src/Shared/ChunkingCookieManager/ChunkingCookieManager.cs) is a service that breaks down long cookies for responses and reassembles them from requests.


`TicketDataFormat`

Ticket data format is used to serialize/deserialize + encrypt/decrypt identity (user info) from cookies.

[![alt_text](/assets/2022-09-31-dot-net-auth-internals-pt2-cookies/image32.png "image_tooltip")](/assets/2022-09-31-dot-net-auth-internals-pt2-cookies/image32.png "image_tooltip")

It is Initialized [here](https://github.com/dotnet/aspnetcore/blob/main/src/Security/Authentication/Cookies/src/PostConfigureCookieAuthenticationOptions.cs)

[![alt_text](/assets/2022-09-31-dot-net-auth-internals-pt2-cookies/image24.png "image_tooltip")](/assets/2022-09-31-dot-net-auth-internals-pt2-cookies/image24.png "image_tooltip")

<br>

### **CookieAuthenticationHandler - Magic**

[CookieAuthenticationHandler source code](https://github.com/dotnet/aspnetcore/blob/main/src/Security/Authentication/Cookies/src/CookieAuthenticationHandler.cs)

To be able to authenticate the request successfully we should sign in it first.

[HandleSignInAsync](https://github.com/dotnet/aspnetcore/blob/main/src/Security/Authentication/Cookies/src/CookieAuthenticationHandler.cs#L280)

[CookieAuthenticationHandler](https://github.com/dotnet/aspnetcore/blob/main/src/Security/Authentication/Cookies/src/CookieAuthenticationHandler.cs) extends [SignInAuthenticationHandler](https://github.com/dotnet/aspnetcore/blob/main/src/Security/Authentication/Core/src/SignInAuthenticationHandler.cs) which has `SignInAsync` method.


[![alt_text](/assets/2022-09-31-dot-net-auth-internals-pt2-cookies/image17.png "image_tooltip")](/assets/2022-09-31-dot-net-auth-internals-pt2-cookies/image17.png "image_tooltip")

You may be interested in what is `ResolveTarget()`, what is target at all, and why it is here. To put it simply we can combine different authentication schemes and this method is needed for managing those combinations. You could see the answer for “why” by following [this stack overflow question](https://stackoverflow.com/questions/55062245/authentication-based-dynamically-on-authorization-header-scheme-in-non-mvc-asp-n)

Target here is some another authentication scheme. If you have some different ForwardSignIn schemes in your authentication options it will try to sign in with this scheme and bypass the current handler.

The main behavior for signing in is implemented in `HandleSignInAsync` method which is abstract and implemented in our `CookieAuthenticationHandler`.

[HandleSignInAsync - first part](https://github.com/dotnet/aspnetcore/blob/main/src/Security/Authentication/Cookies/src/CookieAuthenticationHandler.cs#L280)

[![alt_text](/assets/2022-09-31-dot-net-auth-internals-pt2-cookies/image30.png "image_tooltip")](/assets/2022-09-31-dot-net-auth-internals-pt2-cookies/image30.png "image_tooltip")

Line 292: `EnsureCookieTicket` tries to get cookies, then read, unencrypt, extract principal verify expiration of authentication ticket. Also, this operation sets additional data like session id.

[![alt_text](/assets/2022-09-31-dot-net-auth-internals-pt2-cookies/image26.png "image_tooltip")](/assets/2022-09-31-dot-net-auth-internals-pt2-cookies/image26.png "image_tooltip")

Here it ensures operation is done once.

[![alt_text](/assets/2022-09-31-dot-net-auth-internals-pt2-cookies/image28.png "image_tooltip")](/assets/2022-09-31-dot-net-auth-internals-pt2-cookies/image28.png "image_tooltip")

Then method [ReadCookieTicket](https://github.com/dotnet/aspnetcore/blob/main/src/Security/Authentication/Cookies/src/CookieAuthenticationHandler.cs#L139) does:

Line 141: reads cookie from the request

Line 147: unprotect it (reads and unencrypt using data protection), from this ticket we can get user-specific data (identity).

Line 153-167: tries to save session key for future if the session is enabled (it might not be enabled)

Line 172-182: checks whether auth ticket is not expired

If all checks are passed it returns `AuthenticateResult.Success` with auth ticket.

Line 293: builds different cookie options like SameSite, HttpOnly, SecurePolicy, etc.

[HandleSignInAsync - second part](https://github.com/dotnet/aspnetcore/blob/main/src/Security/Authentication/Cookies/src/CookieAuthenticationHandler.cs#L290)

[![alt_text](/assets/2022-09-31-dot-net-auth-internals-pt2-cookies/image6.png "image_tooltip")](/assets/2022-09-31-dot-net-auth-internals-pt2-cookies/image6.png "image_tooltip")

Line 295: builds signin context with all info available at this point including user info, httpcontext, scheme, cookie options, etc.

Line 304-317: updates issued and expired time for authentication validity.

Line 319: calls SigningIn event to notify subscribers.

Line 321: updates expired time for cookies (not for authentication validity).

[HandleSignInAsync - third part](https://github.com/dotnet/aspnetcore/blob/main/src/Security/Authentication/Cookies/src/CookieAuthenticationHandler.cs#L324)

[![alt_text](/assets/2022-09-31-dot-net-auth-internals-pt2-cookies/image16.png "image_tooltip")](/assets/2022-09-31-dot-net-auth-internals-pt2-cookies/image16.png "image_tooltip")

Line 329-346: if the session store is configured - then a tricky thing happens - it stores the user in this store and puts only the session id into auth ticket. It means that your cookie will contain only the session id encrypted.

`IMPORTANT NOTE`

If your session store is an InMemory store, you cannot do straightforward scaling of servers, because your application is stateful.

In case of storing all user identity info in cookies, you could configure the same data protection keys for all replicas and do your replication as you want because the instances will be stateless.

Line 348: serializing and encryption of cookie value using data protection.

Line 350-354: writing the cookie value into the response (header).

Line 356-363: publishing signed in the event to subscribers

Line 366: setting additional headers and return URL, calling events.

[HandleAuthenticateAsync](https://github.com/dotnet/aspnetcore/blob/main/src/Security/Authentication/Cookies/src/CookieAuthenticationHandler.cs#L280)

[![alt_text](/assets/2022-09-31-dot-net-auth-internals-pt2-cookies/image14.png "image_tooltip")](/assets/2022-09-31-dot-net-auth-internals-pt2-cookies/image14.png "image_tooltip")

Line 191: The actual authentication happens here. It reads user identity from cookies (already discussed in `HandleSignInAsync`) and returns successful AuthenticateResult if the cookie is valid and it is not expired along with the authentication ticket.

Line 199: we try to refresh cookies' expiration if the remaining time is less than half of the whole expiration time.

[![alt_text](/assets/2022-09-31-dot-net-auth-internals-pt2-cookies/image19.png "image_tooltip")](/assets/2022-09-31-dot-net-auth-internals-pt2-cookies/image19.png "image_tooltip")

<br>

## **Demo**

For the example purpose I’ve created a simple demo that could be found by following this link:

[Demo source code](https://github.com/andreyka26-git/dot-net-samples/tree/main/AuthorizationSample/SimpleAuth/Cookie.BackendOnly)

It is a pure backend without anything unnecessary. You could use it through the swagger because cookies are set to domain.

Registering scheme and other authentication services along with CookieAuthenticationHandler:

[![alt_text](/assets/2022-09-31-dot-net-auth-internals-pt2-cookies/image8.png "image_tooltip")](/assets/2022-09-31-dot-net-auth-internals-pt2-cookies/image8.png "image_tooltip")


`Sign in using cookies`:

[![alt_text](/assets/2022-09-31-dot-net-auth-internals-pt2-cookies/image1.png "image_tooltip")](/assets/2022-09-31-dot-net-auth-internals-pt2-cookies/image1.png "image_tooltip")

Line 15: this method is supposed to check the password hash against stored one in your database or any other storage. But for the sample, it checks whether the username and password are mines.

Line 22-32: setting claims identity with necessary claims (user data).

Line 34: setting auth cookies.

[![alt_text](/assets/2022-09-31-dot-net-auth-internals-pt2-cookies/image29.png "image_tooltip")](/assets/2022-09-31-dot-net-auth-internals-pt2-cookies/image29.png "image_tooltip")

As you can see we have set authentication cookies.

`Authenticate using cookies`:

[![alt_text](/assets/2022-09-31-dot-net-auth-internals-pt2-cookies/image13.png "image_tooltip")](/assets/2022-09-31-dot-net-auth-internals-pt2-cookies/image13.png "image_tooltip")

This endpoint just outputs one of your claims (Name). If you are authenticated you will see the username.

[![alt_text](/assets/2022-09-31-dot-net-auth-internals-pt2-cookies/image18.png "image_tooltip")](/assets/2022-09-31-dot-net-auth-internals-pt2-cookies/image18.png "image_tooltip")

[![alt_text](/assets/2022-09-31-dot-net-auth-internals-pt2-cookies/image22.png "image_tooltip")](/assets/2022-09-31-dot-net-auth-internals-pt2-cookies/image22.png "image_tooltip")

As you can see we can successfully read user identity from cookies. 

Thank you for your attention. Please leave feedback.
