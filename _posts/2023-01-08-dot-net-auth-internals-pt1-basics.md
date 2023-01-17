---
layout: post
title: ".NET Auth internals pt1: basics"
date: 2023-01-08 11:02:35 -0000
category: [".NET Auth Internals"]
tags: [guides, authorization, dotnet, tutorials]
description: "This article is entry one about authentication and authorization internals in .NET. We will overview all source code, common services, architecture and design to understand how it works. We will go through github source code of aspnetcore repostory and figure out how authentication works in .net"
---

* TOC
{:toc}

<!-- Output copied to clipboard! -->

<!-----

You have some errors, warnings, or alerts. If you are using reckless mode, turn it off to see inline alerts.
* ERRORs: 0
* WARNINGs: 0
* ALERTS: 19

Conversion time: 6.316 seconds.


Using this Markdown file:

1. Paste this output into your source file.
2. See the notes and action items below regarding this conversion run.
3. Check the rendered output (headings, lists, code blocks, tables) for proper
   formatting and use a linkchecker before you publish this page.

Conversion notes:

* Docs to Markdown version 1.0β33
* Tue Nov 01 2022 09:19:22 GMT-0700 (PDT)
* Source doc: .NET Auth internals pt1: basics
* This document has images: check for >>>>>  gd2md-html alert:  inline image link in generated source and store images to your server. NOTE: Images in exported zip file from Google Docs may not appear in  the same order as they do in your doc. Please check the images!

----->

## **Why you may want to read this article**

I am a technical guy, and I like to research the `internals` of the things I am using daily, and how they work `under the hood`.

There is some information about how to add authentication to your application. And guides sound like “copy this, paste there and it should work”. The problem here is that there are a lot of ways to do authentication in your app:

- Simple and / or custom schemes: [using JWT](https://andreyka26.com/jwt-auth-using-dot-net-and-react), [using Cookies](https://andreyka26.com/dot-net-auth-internals-pt2-cookies), Custom auth handlers
- Using external identity providers: [Google auth](https://andreyka26.com/dot-net-auth-internals-pt3-google), and Facebook auth, with a combination of [JWT](https://andreyka26.com/jwt-auth-using-dot-net-and-react), [Cookies](https://andreyka26.com/dot-net-auth-internals-pt2-cookies) on your side.
- Implementing our own [OAuth service](https://andreyka26.com/auth-from-backend-perspective-pt3-oauth-basics) could use [Google auth](https://andreyka26.com/dot-net-auth-internals-pt3-google), Facebook auth, [Cookies](https://andreyka26.com/dot-net-auth-internals-pt2-cookies), return using JWT, etc.

For me, it never was clear how it works how those things are connected, and how they can be combined and used together.

This is the entry article about authentication internals in .NET 5. Here I’m going to go through the [source code](https://github.com/dotnet/aspnetcore) of the Authentication Core of .NET and explain the basic shared services.
 
After that, I will launch a bunch of more specific auth internals overviews: cookies-based, JWT-based, Google-based, OAuth-based, etc.

<br>

## **Terminology**

<br>

### **Authenticate**

`Authenticate` - means checking whether the current request contains any auth and contracting User (ClaimsPrincipal) from this info.

For example:

1. `JwtBearerHandler` authentication means checking the “Authorize” header and checking the token validity.
2. `CookieHandler` authentication means checking and validating cookies.
3. External auth (`Google`, `Facebook`, `Microsoft`) means emitting OAuth flow with configured API keys and secrets and ensuring external auth result is successful. Note, this is only in case if our application didn't set its own cookies before, I have explained it in [this article](https://andreyka26.com/dot-net-auth-internals-pt3-google).

<br>

### **Sign In & Sign Out**

`Sign In` - means making a future set of requests authenticated. It basically tries to persist the user (`ClaimsPrincipal`). Keep in mind not all handlers can sign in.

A good example of it is `CookieHandler`. It sets Cookies in response so that all subsequent requests include cookies and be authenticated.

`Sign out` - means making all subsequent requests not authenticated. Keep in mind not all handlers can sign out.

A good example is still `CookieHandler`.

<br>

## **General Authentication Services**

Every auth implementation starts with the Registration of necessary services and then using the appropriate middleware that we’ve registered. Those are services and middlewares that are used in each authentication type: Cookie-based, JWT-based, Google-based, etc.

Before this part, let's take a look at what will be registered. So high-level components & connectors overview (runtime) is the following:

[![alt_text](/assets/2022-09-31-dot-net-auth-internals-pt1-basics/image14.png "image_tooltip")](/assets/2022-09-31-dot-net-auth-internals-pt1-basics/image14.png "image_tooltip")

<br>

### **AuthenticationScheme**

[AuthenticationScheme source code](https://github.com/dotnet/aspnetcore/blob/main/src/Http/Authentication.Abstractions/src/AuthenticationScheme.cs)

[![alt_text](/assets/2022-09-31-dot-net-auth-internals-pt1-basics/image15.png "image_tooltip")](/assets/2022-09-31-dot-net-auth-internals-pt1-basics/image15.png "image_tooltip")

The most important concept is `Authentication Scheme`, put in simple words - it is the thing that represents what auth you are going to use. There are different auth schemes:

- Cookie: `CookieAuthenticationDefaults.AuthenticationScheme`
- JWT: `JwtBearerDefaults.AuthenticationScheme`
- Google: `GoogleDefaults.AuthenticationScheme`

And many others. The scheme is a way to tell auth middleware how it should process the request to make auth for you.

Each `Authentication Scheme` is tied to a particular `AuthenticationHandler` or `AuthenticationRequestHandler` by having a specific HandlerType at the 39th line above. This type is used to instantiate (or resolve using DI) `AuthenticationHandler` for specific Schemes to handle auth process.

<br>

### **IAuthenticationHandler**

[IAuthenticationHandler source code](https://github.com/dotnet/aspnetcore/blob/main/src/Http/Authentication.Abstractions/src/IAuthenticationHandler.cs)

[![alt_text](/assets/2022-09-31-dot-net-auth-internals-pt1-basics/image2.png "image_tooltip")](/assets/2022-09-31-dot-net-auth-internals-pt1-basics/image2.png "image_tooltip")

Each `Authentication Scheme` has a dedicated `Authentication Handler` that implements the interface above. Most usually we will try to cast to another derived interface to be able to sign in, sign out, etc.

For example, the Cookie-based handler interface has these `SignIn` and `SignOut` interfaces and [classes](https://github.com/dotnet/aspnetcore/blob/main/src/Http/Authentication.Abstractions/src/IAuthenticationSignOutHandler.cs) extended.

<br>

### **IAuthenticationRequestHandler**

[IAuthenticationRequestHandler source code](https://github.com/dotnet/aspnetcore/blob/main/src/Http/Authentication.Abstractions/src/IAuthenticationRequestHandler.cs)

[![alt_text](/assets/2022-09-31-dot-net-auth-internals-pt1-basics/image1.png "image_tooltip")](/assets/2022-09-31-dot-net-auth-internals-pt1-basics/image1.png "image_tooltip")

Some of the `AuthenticationHandlers` could implement `IAuthenticationRequestHandler`.

This interface extends `IAuthenticationHandler` we have discussed above and is used to handle auth and returns whether we need to authenticate with HttpContext later or not (line 19).

For now, it could be not that clear why we need this `IAuthenticationRequestHandler` if we already have `IAuthenticationHandler`. We will discuss this along with `AuthenticationMiddleware`. But most usually they are used to perform OAuth flow with Google, Facebook, Github, etc.

One thing to remember: if this method returns true - the auth request is considered processed and we should stop.

<br>

### **AuthenticationSchemeProvider**

[AuthenticationSchemeProvider source code](https://github.com/dotnet/aspnetcore/blob/main/src/Http/Authentication.Core/src/AuthenticationSchemeProvider.cs)

This service takes care of managing all schemes and providing them whenever required in an optimal and thread-safe manner.

The most important part here is part of adding a particular scheme:

[On this line](https://github.com/dotnet/aspnetcore/blob/main/src/Http/Authentication.Core/src/AuthenticationSchemeProvider.cs#L137)

[![alt_text](/assets/2022-09-31-dot-net-auth-internals-pt1-basics/image10.png "image_tooltip")](/assets/2022-09-31-dot-net-auth-internals-pt1-basics/image10.png "image_tooltip")

This provider keeps two types of schemes:

- All schemes (line 140)
- Schemes with the IAuthenticationRequestHandler handler type we have discussed above (line 137).

<br>

### **AuthenticationHandlerProvider**

[AuthenticationHandlerProvider source code](https://github.com/dotnet/aspnetcore/blob/main/src/Http/Authentication.Core/src/AuthenticationHandlerProvider.cs)

This provider does not have any rocket science.

It resolves particular `AuthenticationHandler` based on the scheme, using `AuthenticationSchemeProvider` (remember this HandlerType field in AuthenticationScheme class).

[![alt_text](/assets/2022-09-31-dot-net-auth-internals-pt1-basics/image11.png "image_tooltip")](/assets/2022-09-31-dot-net-auth-internals-pt1-basics/image11.png "image_tooltip")

<br>

### **AuthenticationMiddleware**

[AuthenticationMiddleware source code](https://github.com/dotnet/aspnetcore/blob/main/src/Security/Authentication/Core/src/AuthenticationMiddleware.cs#L46)

[![alt_text](/assets/2022-09-31-dot-net-auth-internals-pt1-basics/image5.png "image_tooltip")](/assets/2022-09-31-dot-net-auth-internals-pt1-basics/image5.png "image_tooltip")

It is impossible to do auth without `AuthenticationMiddleware`. This middleware is invoked for each request to do auth process. By doing auth process it verifies the authentication ticket and sets `HttpContext.User` property so we can access it from controllers.

`Line 55-63`: we try each scheme that is tied to the `IAuthenticationRequestHandler` handler type to do auth process. Usually implementation of this interface are remote auth implementation like Google, Facebook, Github. This handler performs OAuth flow, and Sign In request, as explained [here](https://andreyka26.com/dot-net-auth-internals-pt3-google).
If a particular request handler returned true then it means no need to continue auth, we return.

`Line 65-79`: In case of all `IAuthenticationRequestHandler`s skipped auth, or they were not found at all - we try to authenticate using context. Authentication using context will be considered later.

A good example of the handler that is implementing `IAuthenticationRequestHandler` is [RemoteAuthenticationHandler](https://github.com/dotnet/aspnetcore/blob/main/src/Security/Authentication/Core/src/RemoteAuthenticationHandler.cs). 

It is used in most External auth handlers: Google, Facebook, Microsoft, Github, etc.

There is just part of this method:
[![alt_text](/assets/2022-09-31-dot-net-auth-internals-pt1-basics/image13.png "image_tooltip")](/assets/2022-09-31-dot-net-auth-internals-pt1-basics/image13.png "image_tooltip")

It is a good question why we might want to keep authenticating after handling the request using some `IAuthenticationRequestHandler`.

I see a few possible scenarios for this:

1. Let's say we have Microsoft and Google auth in place, we will iterate through both of them. So there is a collection of schemes: [`MicrosoftHandler, GoogleHandler`]. First goes `MicrosoftHandler`. If we got a Google auth request the `MicrosoftHandler` will skip the request and return false, but after this `GoogleHandler` will handle it and return true.
2. Let’s say we have JwtBearerHandler and GoogleHandler. If the request for auth is for JWT the GoogleHandler will skip and return false. Then the code flow will go out of foreach.

<br>

### **AuthenticationHttpContextExtensions**

[HttpContext.AuthenticateAsync](https://github.com/dotnet/aspnetcore/blob/main/src/Http/Authentication.Abstractions/src/AuthenticationHttpContextExtensions.cs#L31) simply resolves `AuthenticationService` which in turn authenticates the request.

[![alt_text](/assets/2022-09-31-dot-net-auth-internals-pt1-basics/image4.png "image_tooltip")](/assets/2022-09-31-dot-net-auth-internals-pt1-basics/image4.png "image_tooltip")


[HttpContext.SignInAsync](https://github.com/dotnet/aspnetcore/blob/main/src/Http/Authentication.Abstractions/src/AuthenticationHttpContextExtensions.cs#L157) resolves AuthenticationService as well which signs in the request.

[![alt_text](/assets/2022-09-31-dot-net-auth-internals-pt1-basics/image12.png "image_tooltip")](/assets/2022-09-31-dot-net-auth-internals-pt1-basics/image12.png "image_tooltip")

<br>

### **AuthenticationService**

[AuthenticateAsync](https://github.com/dotnet/aspnetcore/blob/main/src/Http/Authentication.Core/src/AuthenticationService.cs#L59)


[![alt_text](/assets/2022-09-31-dot-net-auth-internals-pt1-basics/image16.png "image_tooltip")](/assets/2022-09-31-dot-net-auth-internals-pt1-basics/image6.png "image_tooltip")
`AuthenticateAsync` resolves particular IAuthenticationHandler from [IAuthenticationHandlerProvider](https://github.com/dotnet/aspnetcore/blob/main/src/Http/Authentication.Core/src/AuthenticationHandlerProvider.cs) by the authentication scheme. No rocket science - just resolve from DI container by Handler Type.

Then it calls the AuthenticateAsync method on the handler and creates `AuthenticateResult` with the corresponding auth ticket, claims, and user.

[SignInAsync](https://github.com/dotnet/aspnetcore/blob/main/src/Http/Authentication.Core/src/AuthenticationService.cs#L164)

[![alt_text](/assets/2022-09-31-dot-net-auth-internals-pt1-basics/image9.png "image_tooltip")](/assets/2022-09-31-dot-net-auth-internals-pt1-basics/image9.png "image_tooltip")

`SignInAsync` is acting pretty similar to AuthenticateAsync. It resolves particular `IAuthenticationHandler` from [IAuthenticationHandlerProvider](https://github.com/dotnet/aspnetcore/blob/main/src/Http/Authentication.Core/src/AuthenticationHandlerProvider.cs) by the authentication scheme. Then it calls the SignInAsync method on the handler.

This is a kind of wrapper on every provider that calls necessary `IAuthenticationHandler` methods, the main magic is in those handlers.

<br>

### **AuthenticateResult**

[AuthenticateResult source code](https://github.com/dotnet/aspnetcore/blob/main/src/Http/Authentication.Abstractions/src/AuthenticateResult.cs)

[![alt_text](/assets/2022-09-31-dot-net-auth-internals-pt1-basics/image6.png "image_tooltip")](/assets/2022-09-31-dot-net-auth-internals-pt1-basics/image6.png "image_tooltip")

This is a container with related auth info.

If authentication is successful AuthenticateResult will contain related data and authentication: `AuthenticationTicket` and `ClaimsPrincipal`.

If authentication is not successful then it will contain failure details.

`AuthenticateResult` contains `ClaimsPrincipal`. For a simpler understanding, it is a kind of authenticated user object. `ClaimsPrincipal` in turn contains a collection of `ClaimsIdentity` which in turn contains a collection of `Claims`. So it looks like this: 

[![alt_text](/assets/2022-09-31-dot-net-auth-internals-pt1-basics/image7.png "image_tooltip")](/assets/2022-09-31-dot-net-auth-internals-pt1-basics/image7.png "image_tooltip")


[ClaimsPrincipal source code](https://github.com/microsoft/referencesource/blob/master/mscorlib/system/security/claims/ClaimsPrincipal.cs)

It is a bag with user-associated identity information. The most important part of this class for us is `ClaimsIdentity`.

[ClaimsIdentity source code](https://github.com/microsoft/referencesource/blob/master/mscorlib/system/security/claims/ClaimsIdentity.cs)

[![alt_text](/assets/2022-09-31-dot-net-auth-internals-pt1-basics/image17.png "image_tooltip")](/assets/2022-09-31-dot-net-auth-internals-pt1-basics/image17.png "image_tooltip")

For ClaimsIdentity what we are interested in is a collection of claims that are related to the user.

[Claim source code](https://github.com/microsoft/referencesource/blob/master/mscorlib/system/security/claims/Claim.cs)

A Claim is one piece of information about the authenticated user: id, email, first name, role, etc. It has type and value.

<br>

## **Registering services**

Now let’s look at registration for all of those services we have discussed.

<br>

### **AddAuthentication**

Registration starts with

[.AddAuthentication source code](https://github.com/dotnet/aspnetcore/blob/7cb457bdaac8de9214391a9b9b273821d01c2300/src/Security/Authentication/Core/src/AuthenticationServiceCollectionExtensions.cs#L19)

[![alt_text](/assets/2022-09-31-dot-net-auth-internals-pt1-basics/image8.png "image_tooltip")](/assets/2022-09-31-dot-net-auth-internals-pt1-basics/image8.png "image_tooltip")

This method in turn registers different general services for authentication. The most interesting for us is the following:

[.AddAuthenticationCore source code](https://github.com/dotnet/aspnetcore/blob/7cb457bdaac8de9214391a9b9b273821d01c2300/src/Http/Authentication.Core/src/AuthenticationCoreServiceCollectionExtensions.cs#L19)

[![alt_text](/assets/2022-09-31-dot-net-auth-internals-pt1-basics/image19.png "image_tooltip")](/assets/2022-09-31-dot-net-auth-internals-pt1-basics/image19.png "image_tooltip")

These are general services needed for authentication, the most important we already discussed above.

[.AddDataProtection source code](https://github.com/dotnet/aspnetcore/blob/7cb457bdaac8de9214391a9b9b273821d01c2300/src/DataProtection/DataProtection/src/DataProtectionServiceCollectionExtensions.cs#L31)

[![alt_text](/assets/2022-09-31-dot-net-auth-internals-pt1-basics/image3.png "image_tooltip")](/assets/2022-09-31-dot-net-auth-internals-pt1-basics/image3.png "image_tooltip")

It registers different services for the security of the auth data, for example, encryption of cookies.

<br>

### **UseAuthentication**

After we registered all services we need to add middlewares to allow them to authenticate and authorize requests before they go to controllers/pages/etc.

For registering authentication we are using [.UseAuthentication](https://github.com/dotnet/aspnetcore/blob/main/src/Security/Authentication/Core/src/AuthAppBuilderExtensions.cs#L20)

[![alt_text](/assets/2022-09-31-dot-net-auth-internals-pt1-basics/image18.png "image_tooltip")](/assets/2022-09-31-dot-net-auth-internals-pt1-basics/image18.png "image_tooltip")

This method just registers important middleware which does all work named `AuthenticationMiddleware` which we have already discussed.

<br>

## **Follow up**

These are the basic services that are used for different auth handlers. In the next articles - we will consider particular authentication handlers: [Cookie-based](https://andreyka26.com/dot-net-auth-internals-pt2-cookies), Jwt-based, [Google-based](https://andreyka26.com/dot-net-auth-internals-pt3-google), etc. They contain most of the magic inside.
