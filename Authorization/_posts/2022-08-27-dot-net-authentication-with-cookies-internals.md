---
layout: post
title: ".NET Authentication with cookies internals"
date: 2022-08-27 11:02:35 -0000
tags: [guides, authorization, dotnet, tutorials]
description: "This article will show you cookie authentication handler internal for .NET Core. We will cover everything that going on under hood by looking into the source code."
---

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
* Source doc: .NET Authentication with cookies internals
* This document has images: check for >>>>>  gd2md-html alert:  inline image link in generated source and store images to your server. NOTE: Images in exported zip file from Google Docs may not appear in  the same order as they do in your doc. Please check the images!

----->



### Why you may want to read this article

I am a pretty technical guy, and I like to research the **internals** of the things I am using daily, and how they work **under the hood**. This time it is **Authentication** and **Authorization**. 

There is some information about how to add authentication to your application. And guides sound like “copy this, paste there and it should work”. The problem here is that there are a lot of ways to do authentication in your app:



* Simple ones: JWT, Cookies, Custom auth handlers
* Using external identity providers: Google auth, and Facebook auth, with a combination of JWT, Cookies on your side.
* Implementing our own OAuth service which in turn could use Google auth, Facebook auth, cookies, returns JWT, etc.

And for me it is not clear what I should do for some particular combination, there is no guide for each of these situations.

 \
This is the entry article about authentication internals in .NET 5. Here I’m going to go through the **source code** of the Authentication Core of .NET, by implementing authentication using **Cookies**.

 \
If you would like to learn cookies auth straight away - please go to the “CookieAuthenticationHandler - Magic” topic of this article. Because first part is a general overview of authentication.

<br>

### General Authentication Services

Every auth implementation starts with the Registration of necessary services and then using appropriate middlewares that we’ve registered.

Before this part, let's take a look at what will be registered. So high-level components & connectors overview (runtime) is the following:


![alt_text](/assets/2022-08-27-dot-net-authentication-with-cookies-internals/image15.png "image_tooltip")

<br>

#### Authentication Scheme

[https://github.com/dotnet/aspnetcore/blob/main/src/Http/Authentication.Abstractions/src/AuthenticationScheme.cs](https://github.com/dotnet/aspnetcore/blob/main/src/Http/Authentication.Abstractions/src/AuthenticationScheme.cs)


![alt_text](/assets/2022-08-27-dot-net-authentication-with-cookies-internals/image9.png "image_tooltip")


The most important concept is **Authentication Scheme**, put in simple words - it is the thing that represents what auth you are going to use. There are different auth schemes:



* Cookie: **CookieAuthenticationDefaults.AuthenticationScheme**
* JWT:  **JwtBearerDefaults.AuthenticationScheme**
* Google: **GoogleDefaults.AuthenticationScheme**

And many others. The scheme is a way to tell auth middleware how it should process the request to make auth for you.

Each **Authentication Scheme** is tied to particular **AuthenticationHandler** or **AuthenticationRequestHandler** by having specific HandlerType at the 36th line above. This type is used to instantiate (or resolve using DI) AuthenticationHandler for specific Schemes to handle auth process.

<br>

#### IAuthenticationHandler

[https://github.com/dotnet/aspnetcore/blob/main/src/Http/Authentication.Abstractions/src/IAuthenticationHandler.cs](https://github.com/dotnet/aspnetcore/blob/main/src/Http/Authentication.Abstractions/src/IAuthenticationHandler.cs)


![alt_text](/assets/2022-08-27-dot-net-authentication-with-cookies-internals/image11.png "image_tooltip")


Each Authentication Scheme has a dedicated Authentication Handler that implements the interface above. Most usually we will try to cast to another derived interface to be able to sign in, sign out, etc.

<br>

#### IAuthenticationRequestHandler

[https://github.com/dotnet/aspnetcore/blob/main/src/Http/Authentication.Abstractions/src/IAuthenticationRequestHandler.cs](https://github.com/dotnet/aspnetcore/blob/main/src/Http/Authentication.Abstractions/src/IAuthenticationRequestHandler.cs)


![alt_text](/assets/2022-08-27-dot-net-authentication-with-cookies-internals/image2.png "image_tooltip")


Some of the **AuthenticationHandlers** could implement **IAuthenticationRequestHandler**.

This interface extends **IAuthenticationHandler** we have discussed above and is used to handle auth and returns whether we need to authenticate with HttpContext later or not (line 19).

For now, it could be not that clear why we need this IAuthenticationRequestHandler and what it does. We will discuss this soon.

<br>

#### AuthenticationSchemeProvider

[https://github.com/dotnet/aspnetcore/blob/main/src/Http/Authentication.Core/src/AuthenticationSchemeProvider.cs](https://github.com/dotnet/aspnetcore/blob/main/src/Http/Authentication.Core/src/AuthenticationSchemeProvider.cs)

This service takes care of managing all schemes and providing them whenever required in an optimal and thread-safe manner. 

The most important part here is part of adding a particular scheme:

[https://github.com/dotnet/aspnetcore/blob/main/src/Http/Authentication.Core/src/AuthenticationSchemeProvider.cs#L137](https://github.com/dotnet/aspnetcore/blob/main/src/Http/Authentication.Core/src/AuthenticationSchemeProvider.cs#L137)


![alt_text](/assets/2022-08-27-dot-net-authentication-with-cookies-internals/image20.png "image_tooltip")


This provider keeps two types of schemes:



* All schemes (line 140)
* Schemes with the IAuthenticationRequestHandler handler type we have discussed above (line 137).

<br>

#### AuthenticationMiddleware

[https://github.com/dotnet/aspnetcore/blob/main/src/Security/Authentication/Core/src/AuthenticationMiddleware.cs#L46](https://github.com/dotnet/aspnetcore/blob/main/src/Security/Authentication/Core/src/AuthenticationMiddleware.cs#L46)


![alt_text](/assets/2022-08-27-dot-net-authentication-with-cookies-internals/image12.png "image_tooltip")


It is impossible to do auth without **AuthenticationMiddleware**. This middleware is invoked for each request to do auth process. By doing auth process it verifies the authentication ticket and sets **HttpContext.User** property so we can access it from controllers.

So, what is going on in this middleware: first we try to do auth for each scheme, but if we did not find any handler - then we try to auth using HttpContext. At first glance, it doesn’t seem much easy to understand. But hold on, I am here to explain things.

Line 55-63: we try each scheme that is tied to the **IAuthenticationRequestHandler** handler type to do auth process. If a particular request handler returned that it does not need to continue authentication and it is done - we return from middleware

Line 65-79: if some of the schemes need to authenticate using HttpContext or if no scheme can handle auth request so far we are authenticating using the HttpContext extension.

<br>

#### AuthenticationHttpContextExtensions

[https://github.com/dotnet/aspnetcore/blob/main/src/Http/Authentication.Abstractions/src/AuthenticationHttpContextExtensions.cs#L31](https://github.com/dotnet/aspnetcore/blob/main/src/Http/Authentication.Abstractions/src/AuthenticationHttpContextExtensions.cs#L31)

**HttpContext.AuthenticateAsync** simply resolves AuthenticationService which in turn authenticates the request. To put it simply “Authenticate” means to check whether the user was previously signed in and whether he was signed in not too long ago.


![alt_text](/assets/2022-08-27-dot-net-authentication-with-cookies-internals/image27.png "image_tooltip")


[https://github.com/dotnet/aspnetcore/blob/main/src/Http/Authentication.Abstractions/src/AuthenticationHttpContextExtensions.cs#L157](https://github.com/dotnet/aspnetcore/blob/main/src/Http/Authentication.Abstractions/src/AuthenticationHttpContextExtensions.cs#L157)

**HttpContext.SignInAsync** resolves AuthenticationService as well which signs in the request. In simple words “sign in” usually means to put some data about the user (identity) somewhere to be able to authenticate the request later on.


![alt_text](/assets/2022-08-27-dot-net-authentication-with-cookies-internals/image34.png "image_tooltip")


<br>

#### AuthenticationService

**AuthenticateAsync**

[https://github.com/dotnet/aspnetcore/blob/main/src/Http/Authentication.Core/src/AuthenticationService.cs#L59](https://github.com/dotnet/aspnetcore/blob/main/src/Http/Authentication.Core/src/AuthenticationService.cs#L59)


![alt_text](/assets/2022-08-27-dot-net-authentication-with-cookies-internals/image25.png "image_tooltip")


**AuthenticateAsync** resolves particular IAuthenticationHandler from **IAuthenticationHandlerProvider** ([https://github.com/dotnet/aspnetcore/blob/main/src/Http/Authentication.Core/src/AuthenticationHandlerProvider.cs](https://github.com/dotnet/aspnetcore/blob/main/src/Http/Authentication.Core/src/AuthenticationHandlerProvider.cs)) by the authentication scheme. No rocket science - just resolve from DI container by Handler Type. 

Then it calls the AuthenticateAsync method on the handler and creates **AuthenticateResult** with the corresponding auth ticket, claims, and user.

**SignInAsync**

[https://github.com/dotnet/aspnetcore/blob/main/src/Http/Authentication.Core/src/AuthenticationService.cs#L164](https://github.com/dotnet/aspnetcore/blob/main/src/Http/Authentication.Core/src/AuthenticationService.cs#L164)


![alt_text](/assets/2022-08-27-dot-net-authentication-with-cookies-internals/image33.png "image_tooltip")


**SignInAsync** is acting pretty similar to AuthenticateAsync. It resolves particular IAuthenticationHandler from **IAuthenticationHandlerProvider** ([https://github.com/dotnet/aspnetcore/blob/main/src/Http/Authentication.Core/src/AuthenticationHandlerProvider.cs](https://github.com/dotnet/aspnetcore/blob/main/src/Http/Authentication.Core/src/AuthenticationHandlerProvider.cs)) provider by the authentication scheme. Then it calls the SignInAsync method on the handler. 

This is a kind of wrapper on every provider that calls necessary IAuthenticationHandler methods, the main magic is in those handlers.

<br>

#### AuthenticateResult

[https://github.com/dotnet/aspnetcore/blob/main/src/Http/Authentication.Abstractions/src/AuthenticateResult.cs](https://github.com/dotnet/aspnetcore/blob/main/src/Http/Authentication.Abstractions/src/AuthenticateResult.cs)


![alt_text](/assets/2022-08-27-dot-net-authentication-with-cookies-internals/image35.png "image_tooltip")


This is a container with related auth info.

If authentication is successful AuthenticateResult will contain related data and authentication: AuthenticationTicket and ClaimsPrincipal.

If authentication is not successful then it will contain failure details.

**AuthenticateResult** contains **ClaimsPrincipal**. For a simpler understanding, it is a kind of authenticated user object. **ClaimsPrincipal** in turn contains a collection of **ClaimsIdentity** which in turn contains a collection of **Claims**. So it looks like this: 



![alt_text](/assets/2022-08-27-dot-net-authentication-with-cookies-internals/image36.png "image_tooltip")



**ClaimsPrincipal**

[https://github.com/microsoft/referencesource/blob/master/mscorlib/system/security/claims/ClaimsPrincipal.cs](https://github.com/microsoft/referencesource/blob/master/mscorlib/system/security/claims/ClaimsPrincipal.cs)

It is a bag with user-associated identity information. The most important part of this class for us is **ClaimsIdentity**.

**ClaimsIdentity**

[https://github.com/microsoft/referencesource/blob/master/mscorlib/system/security/claims/ClaimsIdentity.cs](https://github.com/microsoft/referencesource/blob/master/mscorlib/system/security/claims/ClaimsIdentity.cs)


![alt_text](/assets/2022-08-27-dot-net-authentication-with-cookies-internals/image4.png "image_tooltip")


For ClaimsIdentity what we are interested in is a collection of claims that are related to the user.

**Claim**

[https://github.com/microsoft/referencesource/blob/master/mscorlib/system/security/claims/Claim.cs](https://github.com/microsoft/referencesource/blob/master/mscorlib/system/security/claims/Claim.cs)

A Claim is one piece of information about the authenticated user: id, email, first name, role, etc. It has type and value.

<br>

### Registering services

Now let’s look at registration for all of those services we have discussed.

<br>

#### AddAuthentication

Registration starts with **.AddAuthentication** [https://github.com/dotnet/aspnetcore/blob/7cb457bdaac8de9214391a9b9b273821d01c2300/src/Security/Authentication/Core/src/AuthenticationServiceCollectionExtensions.cs#L19](https://github.com/dotnet/aspnetcore/blob/7cb457bdaac8de9214391a9b9b273821d01c2300/src/Security/Authentication/Core/src/AuthenticationServiceCollectionExtensions.cs#L19)


![alt_text](/assets/2022-08-27-dot-net-authentication-with-cookies-internals/image21.png "image_tooltip")


This method in turn registers different general services for authentication. The most interesting for us is the following:

**.AddAuthenticationCore** [https://github.com/dotnet/aspnetcore/blob/7cb457bdaac8de9214391a9b9b273821d01c2300/src/Http/Authentication.Core/src/AuthenticationCoreServiceCollectionExtensions.cs#L19](https://github.com/dotnet/aspnetcore/blob/7cb457bdaac8de9214391a9b9b273821d01c2300/src/Http/Authentication.Core/src/AuthenticationCoreServiceCollectionExtensions.cs#L19)


![alt_text](/assets/2022-08-27-dot-net-authentication-with-cookies-internals/image7.png "image_tooltip")


These are general services needed for authentication, the most important we already discussed above.

**.AddDataProtection** 

[https://github.com/dotnet/aspnetcore/blob/7cb457bdaac8de9214391a9b9b273821d01c2300/src/DataProtection/DataProtection/src/DataProtectionServiceCollectionExtensions.cs#L31](https://github.com/dotnet/aspnetcore/blob/7cb457bdaac8de9214391a9b9b273821d01c2300/src/DataProtection/DataProtection/src/DataProtectionServiceCollectionExtensions.cs#L31)


![alt_text](/assets/2022-08-27-dot-net-authentication-with-cookies-internals/image3.png "image_tooltip")


It registers different services for the security of the auth data, for example, encryption of cookies.

<br>

#### UseAuthentication

After we registered all services we need to add middlewares to allow them to authenticate and authorize requests before they go to controllers/pages/etc.

For registering authentication we are using **.UseAuthentication**

[https://github.com/dotnet/aspnetcore/blob/main/src/Security/Authentication/Core/src/AuthAppBuilderExtensions.cs#L20](https://github.com/dotnet/aspnetcore/blob/main/src/Security/Authentication/Core/src/AuthAppBuilderExtensions.cs#L20)


![alt_text](/assets/2022-08-27-dot-net-authentication-with-cookies-internals/image31.png "image_tooltip")


And this method just registers important middleware which does all work named **AuthenticationMiddleware** which we have already discussed.

<br>

### Cookie Authentication Handler

It is a time to research how a particular IAuthenticationHandler implementation works. For now, we will take a look at cookies-based authentication.

<br>

#### AddCookie

Regularly, we register the cookies authentication handler using this method **.AddCookie** \
[https://github.com/dotnet/aspnetcore/blob/main/src/Security/Authentication/Cookies/src/CookieExtensions.cs#L25](https://github.com/dotnet/aspnetcore/blob/main/src/Security/Authentication/Cookies/src/CookieExtensions.cs#L25)


![alt_text](/assets/2022-08-27-dot-net-authentication-with-cookies-internals/image23.png "image_tooltip")


All calls go to this method. 30-31 lines are registering configurations and 32 line registers the handler itself. If you would like to see AddScheme implementation - take a look: [https://github.com/dotnet/aspnetcore/blob/main/src/Security/Authentication/Core/src/AuthenticationBuilder.cs#L90](https://github.com/dotnet/aspnetcore/blob/main/src/Security/Authentication/Core/src/AuthenticationBuilder.cs#L90). 

But there is nothing interesting so let’s dive into CookieAuthenticationHandler. But before this, we also need to consider CookieAuthenticationOptions.

<br>

#### CookieAuthenticationOptions

[https://github.com/dotnet/aspnetcore/blob/main/src/Security/Authentication/Cookies/src/CookieAuthenticationOptions.cs](https://github.com/dotnet/aspnetcore/blob/main/src/Security/Authentication/Cookies/src/CookieAuthenticationOptions.cs)

We need to understand some implementation from it:

**CookieManager**

The cookie manager is used to provide cookies from requests and write them to responses.


![alt_text](/assets/2022-08-27-dot-net-authentication-with-cookies-internals/image10.png "image_tooltip")


It is initialized here:

[https://github.com/dotnet/aspnetcore/blob/main/src/Security/Authentication/Cookies/src/PostConfigureCookieAuthenticationOptions.cs](https://github.com/dotnet/aspnetcore/blob/main/src/Security/Authentication/Cookies/src/PostConfigureCookieAuthenticationOptions.cs)


![alt_text](/assets/2022-08-27-dot-net-authentication-with-cookies-internals/image5.png "image_tooltip")


**ChunkingCookieManager** is a service that breaks down long cookies for responses and reassembles them from requests.

[https://github.com/dotnet/aspnetcore/blob/main/src/Shared/ChunkingCookieManager/ChunkingCookieManager.cs](https://github.com/dotnet/aspnetcore/blob/main/src/Shared/ChunkingCookieManager/ChunkingCookieManager.cs)

**TicketDataFormat**

Ticket data format is used to serialize\deserialize +  encrypt\decrypt identity (user info) from cookies.


![alt_text](/assets/2022-08-27-dot-net-authentication-with-cookies-internals/image32.png "image_tooltip")


It is Initialized here:

[https://github.com/dotnet/aspnetcore/blob/main/src/Security/Authentication/Cookies/src/PostConfigureCookieAuthenticationOptions.cs](https://github.com/dotnet/aspnetcore/blob/main/src/Security/Authentication/Cookies/src/PostConfigureCookieAuthenticationOptions.cs)


![alt_text](/assets/2022-08-27-dot-net-authentication-with-cookies-internals/image24.png "image_tooltip")


<br>

#### CookieAuthenticationHandler - Magic

[https://github.com/dotnet/aspnetcore/blob/main/src/Security/Authentication/Cookies/src/CookieAuthenticationHandler.cs](https://github.com/dotnet/aspnetcore/blob/main/src/Security/Authentication/Cookies/src/CookieAuthenticationHandler.cs)

To be able to authenticate the request we should sign in it first.

**SignInAsync**

**CookieAuthenticationHandler** extends **SignInAuthenticationHandler** which has **SIgnInAsync** method.

[https://github.com/dotnet/aspnetcore/blob/main/src/Security/Authentication/Core/src/SignInAuthenticationHandler.cs](https://github.com/dotnet/aspnetcore/blob/main/src/Security/Authentication/Core/src/SignInAuthenticationHandler.cs)


![alt_text](/assets/2022-08-27-dot-net-authentication-with-cookies-internals/image17.png "image_tooltip")


You may be interested in what is ResolveTarget(), what is target at all, and why it is here. To put it simply we can combine different authentication schemes and this method is needed for managing those combinations. You could see the answer for “why”  by following this stack overflow question: [https://stackoverflow.com/questions/55062245/authentication-based-dynamically-on-authorization-header-scheme-in-non-mvc-asp-n](https://stackoverflow.com/questions/55062245/authentication-based-dynamically-on-authorization-header-scheme-in-non-mvc-asp-n).

Target here is some another authentication scheme. If you have some different ForwardSignIn schemes in your authentication options it will try to sign in with this scheme and bypass the current handler.

The main behavior for signing in is implemented in **HandleSignInAsync** method which is abstract and implemented in our **CookieAuthenticationHandler**.

**HandleSignInAsync - first part**

[https://github.com/dotnet/aspnetcore/blob/main/src/Security/Authentication/Cookies/src/CookieAuthenticationHandler.cs#L280](https://github.com/dotnet/aspnetcore/blob/main/src/Security/Authentication/Cookies/src/CookieAuthenticationHandler.cs#L280)


![alt_text](/assets/2022-08-27-dot-net-authentication-with-cookies-internals/image30.png "image_tooltip")


Line 292: **EnsureCookieTicket** tries to get cookies, then read, unencrypt, extract principal verify expiration of authentication ticket.  Also, this operation sets additional data like session id.


![alt_text](/assets/2022-08-27-dot-net-authentication-with-cookies-internals/image26.png "image_tooltip")


Here it ensures operation is done once.


![alt_text](/assets/2022-08-27-dot-net-authentication-with-cookies-internals/image28.png "image_tooltip")


Then method **ReadCookieTicket** does:

Line 141: reads cookie from the request

Line 147: unprotect it (reads and unencrypt using data protection), from this ticket we can get user-specific data (identity).

Line 153-167: tries to save session key for future if the session is enabled (it might not be enabled)

Line 172-182: checks whether auth ticket is not expired

If all checks are passed it returns **AuthenticateResult.Success** with auth ticket.

Line 293: builds different cookie options like SameSite, HttpOnly, SecurePolicy, etc.

**HandleSignInAsync second part**

[https://github.com/dotnet/aspnetcore/blob/main/src/Security/Authentication/Cookies/src/CookieAuthenticationHandler.cs#L280](https://github.com/dotnet/aspnetcore/blob/main/src/Security/Authentication/Cookies/src/CookieAuthenticationHandler.cs#L280)


![alt_text](/assets/2022-08-27-dot-net-authentication-with-cookies-internals/image6.png "image_tooltip")


Line 295: builds signin context with all info available at this point including user info, httpcontext, scheme, cookie options, etc.

Line 304-317: updates issued and expired time for authentication validity.

Line 319: calls SigningIn event to notify subscribers.

Line 321: updates expired time for cookies (not for authentication validity).

**HandleSignInAsync third part**

[https://github.com/dotnet/aspnetcore/blob/main/src/Security/Authentication/Cookies/src/CookieAuthenticationHandler.cs#L280](https://github.com/dotnet/aspnetcore/blob/main/src/Security/Authentication/Cookies/src/CookieAuthenticationHandler.cs#L280)


![alt_text](/assets/2022-08-27-dot-net-authentication-with-cookies-internals/image16.png "image_tooltip")


Line 329-346: if the session store is configured - then a tricky thing happens - it stores the user in this store and puts only the session id into auth ticket. It means that your cookie will contain only the session id encrypted.

**IMPORTANT NOTE**

If your session store is an InMemory store, you cannot do straightforward scaling of servers, because your application is stateful.

In case of storing all user identity info in cookies, you could configure the same data protection keys for all replicas and do your replication as you want because the instances will be stateless.

Line 348: serializing and encryption of cookie value using data protection.

Line 350-354: writing the cookie value into the response (header).

Line 356-363: publishing signed in the event to subscribers

Line 366: setting additional headers and return URL, calling events.

**HandleAuthenticateAsync**

[https://github.com/dotnet/aspnetcore/blob/main/src/Security/Authentication/Cookies/src/CookieAuthenticationHandler.cs#L280](https://github.com/dotnet/aspnetcore/blob/main/src/Security/Authentication/Cookies/src/CookieAuthenticationHandler.cs#L280)


![alt_text](/assets/2022-08-27-dot-net-authentication-with-cookies-internals/image14.png "image_tooltip")


Line 191: The actual authentication happens here. It reads user identity from cookies (already discussed in **HandleSignInAsync**) and returns successful AuthenticateResult if the cookie is valid and it is not expired along with the authentication ticket.

Line 199: we try to refresh cookies' expiration if the remaining time is less than half of the whole expiration time.


![alt_text](/assets/2022-08-27-dot-net-authentication-with-cookies-internals/image19.png "image_tooltip")


<br>

### Demo

For the example purpose I’ve created a simple demo that could be found by following this link:

[https://github.com/andreyka26-git/dot-net-samples/tree/main/AuthorizationSample/SimpleAuth/Cookie.BackendOnly](https://github.com/andreyka26-git/dot-net-samples/tree/main/AuthorizationSample/SimpleAuth/Cookie.BackendOnly)

It is a pure backend without anything unnecessary. You could use it through the swagger because cookies are set to domain. 


Registering scheme and other authentication services along with CookieAuthenticationHandler:


![alt_text](/assets/2022-08-27-dot-net-authentication-with-cookies-internals/image8.png "image_tooltip")


 \
**Sign in using cookies**:


![alt_text](/assets/2022-08-27-dot-net-authentication-with-cookies-internals/image1.png "image_tooltip")


Line 15: this method is supposed to check the password hash against stored one in your database or any other storage. But for the sample, it checks whether the username and password are mines.

Line 22-32: setting claims identity with necessary claims (user data).

Line 34: setting auth cookies.


![alt_text](/assets/2022-08-27-dot-net-authentication-with-cookies-internals/image29.png "image_tooltip")


As you can see we have set authentication cookies.

**Authenticate using cookies**:


![alt_text](/assets/2022-08-27-dot-net-authentication-with-cookies-internals/image13.png "image_tooltip")


This endpoint just outputs one of your claims (Name). If you are authenticated you will see the username.


![alt_text](/assets/2022-08-27-dot-net-authentication-with-cookies-internals/image18.png "image_tooltip")



![alt_text](/assets/2022-08-27-dot-net-authentication-with-cookies-internals/image22.png "image_tooltip")


As you can see we can successfully read user identity from cookies. \
 \
Thank you for your attention. Please leave feedback.