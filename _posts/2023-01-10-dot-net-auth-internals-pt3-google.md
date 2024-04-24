---
layout: post
title: ".NET Auth internals pt3: Google"
date: 2023-01-10 11:02:35 -0000
category: [".NET Auth Internals"]
tags: [authorization]
description: "In this article we are going to consider Google authentication and Google authorization in .NET. We will check all things that happen under hood. So we will go through the source code and check what is going on when we put .AddGoogle(). On top of that we will consider question about why AddGoogle cannot be without AddCookies"
thumbnail: /assets/2023-01-10-dot-net-auth-internals-pt3-google/logo.png
thumbnailwide: /assets/2023-01-10-dot-net-auth-internals-pt3-google/logo-wide.png
---

* TOC
{:toc}

<!-- Copy and paste the converted output. -->

<!-----

You have some errors, warnings, or alerts. If you are using reckless mode, turn it off to see inline alerts.
* ERRORs: 0
* WARNINGs: 0
* ALERTS: 18

Conversion time: 5.306 seconds.


Using this Markdown file:

1. Paste this output into your source file.
2. See the notes and action items below regarding this conversion run.
3. Check the rendered output (headings, lists, code blocks, tables) for proper
   formatting and use a linkchecker before you publish this page.

Conversion notes:

* Docs to Markdown version 1.0β34
* Sat Jan 14 2023 13:40:50 GMT-0800 (PST)
* Source doc: .NET Auth internals pt3: Google
* This document has images: check for >>>>>  gd2md-html alert:  inline image link in generated source and store images to your server. NOTE: Images in exported zip file from Google Docs may not appear in  the same order as they do in your doc. Please check the images!

----->



## **Why you may want to read this article**

This article will cover `Google Authentication and Authorization internals in .NET`. We will go through the source code as usual, and will understand how it works.

Actually this article covers all Remote Authentication schemes like `Microsoft`, `Github`, `Facebook`, etc, because we will explore some common services that actually do all work.

Tricky questions like “Why we cannot use .AddGoogle() without .AddCookies()” deserve separate articles, because they include answers from developers that develop .NET itself, deeper investigation, etc.

In this article we will explore internals of `how Google auth works` and `what happens under hood` every time you use `.AddGoogle()` in your application.

You might check [my article about .NET authentication and authorization internals](https://andreyka26.com/dot-net-auth-internals-pt1-basics), to understand the framework and basics.

On top of that you might check [my article about OAuth](https://andreyka26.com/auth-from-backend-perspective-pt3-oauth-basics) to better understand `Google OAuth` inside .NET

<br>

## **Registering services**

Authentication is similar in .NET so the main magic is happening inside Authentication Handler. But in the case of external authentication some base classes are doing important things, so let’s have a look into the registration of those services.

<br>

### **AddGoogle**

[GoogleExtensions source code](https://github.com/dotnet/aspnetcore/blob/3b5400a286f9e827d9e14aa30a79c5db0df439cc/src/Security/Authentication/Google/src/GoogleExtensions.cs#L65)


[![alt_text](/assets/2023-01-10-dot-net-auth-internals-pt3-google/image5.png "image_tooltip")](/assets/2023-01-10-dot-net-auth-internals-pt3-google/image5.png "image_tooltip"){:target="_blank"}


This call just redirects registering to `AddOAuth`. Since google provides authentication via OAuth protocol it is expected.


<br>

### **AddOAuth**

[OAuthExtensions source code](https://github.com/dotnet/aspnetcore/blob/3b5400a286f9e827d9e14aa30a79c5db0df439cc/src/Security/Authentication/OAuth/src/OAuthExtensions.cs#L58)


[![alt_text](/assets/2023-01-10-dot-net-auth-internals-pt3-google/image10.png "image_tooltip")](/assets/2023-01-10-dot-net-auth-internals-pt3-google/image10.png "image_tooltip"){:target="_blank"}



<br>

### **AddRemoteScheme**

[AuthenticationBuilder source code](https://github.com/dotnet/aspnetcore/blob/main/src/Security/Authentication/Core/src/AuthenticationBuilder.cs#L30)

`AddRemoteScheme` method is just registering auth handler with options. The calls go down to `AddSchemeHelper`. 


[![alt_text](/assets/2023-01-10-dot-net-auth-internals-pt3-google/image13.png "image_tooltip")](/assets/2023-01-10-dot-net-auth-internals-pt3-google/image13.png "image_tooltip"){:target="_blank"}


52nd line: we are validating auth options. `This is the answer to why we cannot have GoogleAuth without CookieAuth`.

Let’s take a look into those options to check what is going on 


<br>

## **Services**

There are 4 layers of Remote Authentication: 

Concrete Implementation -> OAuth implementation -> Remote Authentication implementation -> Base implementation

`Options`:  [GoogleOptions](https://github.com/dotnet/aspnetcore/blob/main/src/Security/Authentication/Google/src/GoogleOptions.cs#L13)--> [OAuthOptions ](https://github.com/dotnet/aspnetcore/blob/4535ea1263e9a24ca8d37b7266797fe1563b8b12/src/Security/Authentication/OAuth/src/OAuthOptions.cs#L12)--> [RemoteAuthenticationOptions](https://github.com/dotnet/aspnetcore/blob/main/src/Security/Authentication/Core/src/RemoteAuthenticationOptions.cs#L41) --> [AuthenticationSchemeOptions](https://github.com/dotnet/aspnetcore/blob/4535ea1263e9a24ca8d37b7266797fe1563b8b12/src/Security/Authentication/Core/src/AuthenticationSchemeOptions.cs)

`Handlers`: [GoogleHandler](https://github.com/dotnet/aspnetcore/blob/4535ea1263e9a24ca8d37b7266797fe1563b8b12/src/Security/Authentication/Google/src/GoogleHandler.cs#L21) -->  [OAuthHandler](https://github.com/dotnet/aspnetcore/blob/4535ea1263e9a24ca8d37b7266797fe1563b8b12/src/Security/Authentication/OAuth/src/OAuthHandler.cs#L23) --> [RemoteAuthenticationHandler](https://github.com/dotnet/aspnetcore/blob/4535ea1263e9a24ca8d37b7266797fe1563b8b12/src/Security/Authentication/Core/src/RemoteAuthenticationHandler.cs#L18) --> [AuthenticationHandler](https://github.com/dotnet/aspnetcore/blob/4535ea1263e9a24ca8d37b7266797fe1563b8b12/src/Security/Authentication/Core/src/AuthenticationHandler.cs)

Handlers have different flow and callstack for different actions: 


The callstack of **`Authenticate`** method which is called during OAuth communication with Google is:

`RemoteAuthenticationHandler.HandleRequestAsync` -> `OAuthHandler.HandleRemoteAuthenticateAsync` -> `GoogleHandler.CreateTicketAsync`

The callstack of **`Authenticate`** method which is called in protected endpoints with [Authorize] attribute is:

`AuthenticationHandler.AuthenticateAsync` -> `RemoteAuthenticationHandler.HandleAuthenticateAsync`

The callstack of **`Challenge`** method is:

`AuthenticationHandler.ChallengeAsync` -> `RemoteAuthenticationHandler (no method)` -> `OAuthHandler.HandleChallengeAsync` -> `GoogleHandler.BuildChallengeUrl`


<br>

### **AuthenticationSchemeOptions**

[AuthenticationSchemeOptions source code](https://github.com/dotnet/aspnetcore/blob/4535ea1263e9a24ca8d37b7266797fe1563b8b12/src/Security/Authentication/Core/src/AuthenticationSchemeOptions.cs)

`AuthenticationSchemeOptions` contains mostly forward scheme options.


[![alt_text](/assets/2023-01-10-dot-net-auth-internals-pt3-google/image9.png "image_tooltip")](/assets/2023-01-10-dot-net-auth-internals-pt3-google/image9.png "image_tooltip"){:target="_blank"}


This is needed especially when we use different schemes at the same time like `GoogleScheme` and `CookiesScheme`. So one scheme can forward to another scheme.


<br>

### **AuthenticationHandler**

[AuthenticationHandler source code](https://github.com/dotnet/aspnetcore/blob/4535ea1263e9a24ca8d37b7266797fe1563b8b12/src/Security/Authentication/Core/src/AuthenticationHandler.cs)

`AuthenticationHandler` contains some common and initialization behavior. I would like to mention a couple of method here.

There are few virtual methods: `HandleChallengeAsync`, `HandleForbiddenAsync`, `HandleAuthenticateAsync` that will be overridden in the derivatives of this handler.

Basically all methods here are trying to resolve target and use one of those derivatives to execute challenge, forbid or authenticate action.

Below I will show example of `ChallengeAsync`, but it is similar for authenticate, forbid, etc.


<br>

#### **ChallengeAsync**


[![alt_text](/assets/2023-01-10-dot-net-auth-internals-pt3-google/image2.png "image_tooltip")](/assets/2023-01-10-dot-net-auth-internals-pt3-google/image2.png "image_tooltip"){:target="_blank"}


280th line: we are trying to resolve new auth scheme (screen below). If successful - we start challenging from scratch via `HttpContextExtensions`.

288th line: we did not resolve any new scheme - so we execute overridden `HandleChallengeAsync` to perform Challenge.


<br>

#### **ResolveTarget**


[![alt_text](/assets/2023-01-10-dot-net-auth-internals-pt3-google/image14.png "image_tooltip")](/assets/2023-01-10-dot-net-auth-internals-pt3-google/image14.png "image_tooltip"){:target="_blank"}


This method is changing one auth scheme to another.

178th line: sets scheme from parameter, but if it is null - then tries to set default scheme from options (from `AuthenticationSchemeOptions`)

181th line: here we ensure that if the resolved sheme is the same as current one - we return null to prevent StackOverflowException. If it is new scheme - we return new one.


<br>

### **RemoteAuthenticationOptions**

[RemoteAuthenticationOptions source code](https://github.com/dotnet/aspnetcore/blob/main/src/Security/Authentication/Core/src/RemoteAuthenticationOptions.cs#L41)

`RemoteAuthenticationOptions` contains different things for OAuth / OpenId Connect protocols especially redirection part of it: HttpClient to communicate to identity provider, data protection provider, callback path, return url, etc.

On top of that it contains [SignInScheme](https://github.com/dotnet/aspnetcore/blob/4535ea1263e9a24ca8d37b7266797fe1563b8b12/src/Security/Authentication/Core/src/RemoteAuthenticationOptions.cs#L112)


[![alt_text](/assets/2023-01-10-dot-net-auth-internals-pt3-google/image1.png "image_tooltip")](/assets/2023-01-10-dot-net-auth-internals-pt3-google/image1.png "image_tooltip"){:target="_blank"}


As you can see from comments, it is DIFFERENT scheme from Remote Scheme (Google, Github, Facebook) that is used to persist user identity after authentication. 

In other words to save user identity somewhere on side of your application to NOT trigger OAuth flow every time. Usually it is Cookies scheme.

These options contains validate method that ensures that `SignInSheme` is not the same as RemoteScheme [here](https://github.com/dotnet/aspnetcore/blob/4535ea1263e9a24ca8d37b7266797fe1563b8b12/src/Security/Authentication/Core/src/RemoteAuthenticationOptions.cs#L41).


[![alt_text](/assets/2023-01-10-dot-net-auth-internals-pt3-google/image18.png "image_tooltip")](/assets/2023-01-10-dot-net-auth-internals-pt3-google/image18.png "image_tooltip"){:target="_blank"}


41nd line: this validation is happening. If our `SignInScheme` is the same as `sheme` (that is GoogleScheme) then we are throwing `RemoteSignInSchemeCannotBeSelf`. Why .NET team did like that we will answer in separate article.


<br>

### **RemoteAuthenticationHandler**

[RemoteAuthenticationHandler source code](https://github.com/dotnet/aspnetcore/blob/4535ea1263e9a24ca8d37b7266797fe1563b8b12/src/Security/Authentication/Core/src/RemoteAuthenticationHandler.cs)

This guy is responsible for handling response from Remote Auth provider. There are a few important methods.


<br>

#### **ShouldHandleRequestAsync**

[ShouldHandleRequestAsync](https://github.com/dotnet/aspnetcore/blob/4535ea1263e9a24ca8d37b7266797fe1563b8b12/src/Security/Authentication/Core/src/RemoteAuthenticationHandler.cs#L58) returns true if the request is coming to Callback path from Authorizataion Server.


[![alt_text](/assets/2023-01-10-dot-net-auth-internals-pt3-google/image17.png "image_tooltip")](/assets/2023-01-10-dot-net-auth-internals-pt3-google/image17.png "image_tooltip"){:target="_blank"}



<br>

#### **HandleRequestAsync**


[![alt_text](/assets/2023-01-10-dot-net-auth-internals-pt3-google/image12.png "image_tooltip")](/assets/2023-01-10-dot-net-auth-internals-pt3-google/image12.png "image_tooltip"){:target="_blank"}


[HandleRequestAsync](https://github.com/dotnet/aspnetcore/blob/4535ea1263e9a24ca8d37b7266797fe1563b8b12/src/Security/Authentication/Core/src/RemoteAuthenticationHandler.cs#L65) is called whenever we get redirected from identity provider to Callback Url (OAuth) to process Authorization Code, get tokens, create identity from them, etc.

67th line: ensures wether request is going to Callback Url

77th line: calls `HandleRemoteAuthenticateAsync` method, overridden in `OAuthHandler`, that returns authentication result with Authentication Ticket + Principal (user data). 

Then a couple of checks are happening with exception handling.

[![alt_text](/assets/2023-01-10-dot-net-auth-internals-pt3-google/image15.png "image_tooltip")](/assets/2023-01-10-dot-net-auth-internals-pt3-google/image15.png "image_tooltip"){:target="_blank"}


162nd line: signs in principal (user data) with `SignInScheme`. As was previously mentioned `SignInScheme` is typically Cookies Scheme, not current Scheme (Google, Github, Facebook, etc). On top of that as we previously mentioned `SignInScheme` must be different from current Authentication Scheme.

170th line: redirects to ReturnUrl (in terms of OAuth) if everything is successful.


<br>

#### **HandleAuthenticateAsync**

[![alt_text](/assets/2023-01-10-dot-net-auth-internals-pt3-google/image7.png "image_tooltip")](/assets/2023-01-10-dot-net-auth-internals-pt3-google/image7.png "image_tooltip"){:target="_blank"}


[HandleAuthenticateAsync](https://github.com/dotnet/aspnetcore/blob/4535ea1263e9a24ca8d37b7266797fe1563b8b12/src/Security/Authentication/Core/src/RemoteAuthenticationHandler.cs#L182) is called whenever we got request to endpoint, protected by `[Authorize]` attribute.

184th line: we try to authenticate with `SignInScheme` (that is typically Cookies Scheme).

The remaining code is error checking and setting authentication result to set principal (user data).


<br>

### **OAuthOptions**

[OAuthOptions source code](https://github.com/dotnet/aspnetcore/blob/4535ea1263e9a24ca8d37b7266797fe1563b8b12/src/Security/Authentication/OAuth/src/OAuthOptions.cs)

`OAuthOptions` contains options needed for OAuth / OpenId Connect: client id, client secret, authorize endpoint, token endpoint, usepkce, etc. To be honest nothing special here.


<br>

### **OAuthHandler**

[OAuthHandler source code](https://github.com/dotnet/aspnetcore/blob/4535ea1263e9a24ca8d37b7266797fe1563b8b12/src/Security/Authentication/OAuth/src/OAuthHandler.cs)

This handler is responsible for all communication according to OAuth / OpenId Connect protocol.


<br>

#### **HandleRemoteAuthenticateAsync**

[![alt_text](/assets/2023-01-10-dot-net-auth-internals-pt3-google/image16.png "image_tooltip")](/assets/2023-01-10-dot-net-auth-internals-pt3-google/image16.png "image_tooltip"){:target="_blank"}


[HandleRemoteAuthenticateAsync](https://github.com/dotnet/aspnetcore/blob/4535ea1263e9a24ca8d37b7266797fe1563b8b12/src/Security/Authentication/OAuth/src/OAuthHandler.cs#L55) is handling redirection to callback url from Authorization Server. It uses Authorization Code grant, so in this method it tries to exchange Authorization Code for tokens.

59-71 lines: verifying state parameter according to OAuth

74th line: processing errors from authorization server


[![alt_text](/assets/2023-01-10-dot-net-auth-internals-pt3-google/image11.png "image_tooltip")](/assets/2023-01-10-dot-net-auth-internals-pt3-google/image11.png "image_tooltip"){:target="_blank"}


117th line: it gets code parameter (Authorization Code)

124-125 lines: tries to exchange code for tokens

137th line: creates empty (default) identity.


[![alt_text](/assets/2023-01-10-dot-net-auth-internals-pt3-google/image6.png "image_tooltip")](/assets/2023-01-10-dot-net-auth-internals-pt3-google/image6.png "image_tooltip"){:target="_blank"}


139-171 lines: persists tokens from Authorization Server if we mark it in the options.

173-181: creates default ticket with empty principal (user) and return it as auth result


<br>

#### **ExchangeCodeAsync**

[![alt_text](/assets/2023-01-10-dot-net-auth-internals-pt3-google/image8.png "image_tooltip")](/assets/2023-01-10-dot-net-auth-internals-pt3-google/image8.png "image_tooltip"){:target="_blank"}


[ExchangeCodeAsync](https://github.com/dotnet/aspnetcore/blob/4535ea1263e9a24ca8d37b7266797fe1563b8b12/src/Security/Authentication/OAuth/src/OAuthHandler.cs#L189) is used for exchange Authorization Code for Access / Id / Refresh tokens. Under hood it is sending request to Authorization Server with OAuth parameters like client id, client secret.

<br>

#### **CreateTicketAsync**

[![alt_text](/assets/2023-01-10-dot-net-auth-internals-pt3-google/image4.png "image_tooltip")](/assets/2023-01-10-dot-net-auth-internals-pt3-google/image4.png "image_tooltip"){:target="_blank"}


[CreateTicketAsync](https://github.com/dotnet/aspnetcore/blob/4535ea1263e9a24ca8d37b7266797fe1563b8b12/src/Security/Authentication/OAuth/src/OAuthHandler.cs#L243) creates authentication ticket with empty principal (user data) that was created in HandleRemoteAuthenticateAsync.

As you can see this method is virtual and it will be overridden in particular Identity Provider (Google, Facebook, Github, etc).


<br>

### **GoogleOptions**

[https://github.com/dotnet/aspnetcore/blob/4535ea1263e9a24ca8d37b7266797fe1563b8b12/src/Security/Authentication/Google/src/GoogleOptions.cs](https://github.com/dotnet/aspnetcore/blob/4535ea1263e9a24ca8d37b7266797fe1563b8b12/src/Security/Authentication/Google/src/GoogleOptions.cs)

[GoogleOptions](https://github.com/dotnet/aspnetcore/blob/4535ea1263e9a24ca8d37b7266797fe1563b8b12/src/Security/Authentication/Google/src/GoogleOptions.cs) class contains initialization behavior with claims mapping from json.


<br>

### **GoogleHandler**

[GoogleHandler](https://github.com/dotnet/aspnetcore/blob/4535ea1263e9a24ca8d37b7266797fe1563b8b12/src/Security/Authentication/Google/src/GoogleHandler.cs) overrides CreateTicketAsync and BuildChallengeUrl that are specific for Google Authorization Server. Because as you remember CreateTicketAsync in OAuthHandler creates default identity with default principal that does not contain data.


<br>

#### **CreateTicketAsync**

[CreateTicketAsync](https://github.com/dotnet/aspnetcore/blob/4535ea1263e9a24ca8d37b7266797fe1563b8b12/src/Security/Authentication/Google/src/GoogleHandler.cs#L32) is overridden from OAuthHandler, it creates Authentication Ticket with data parsed from tokens.


[![alt_text](/assets/2023-01-10-dot-net-auth-internals-pt3-google/image3.png "image_tooltip")](/assets/2023-01-10-dot-net-auth-internals-pt3-google/image3.png "image_tooltip"){:target="_blank"}


38-41 lines: it sends request to Authorization Server to get user data with Access Token.

47-53 lines: it creates ticket from json response of request performed above.


<br>

## **Conclusion**

As we can see, .NET team did a lot of things common for remote authentication. Actual `Google Handler` and `Google Options` have implementation of a few methods. 

Everything else is just behavior that implements OAuth protocol.
 
Why we cannot use `Google Auth` scheme without `Cookies Auth` scheme will be in the next article. 
Please subscribe in my social media - there are news and voting.


Please subscribe to my social media to not miss updates.: [Instagram](https://www.instagram.com/andreyka26_se), [Telegram](https://t.me/programming_space)

I’m talking about life as a Software Engineer at Microsoft.

<br>

Besides that, my projects:

Symptoms Diary: [https://blog.symptom-diary.com](https://blog.symptom-diary.com)

Pet4Pet: [https://pet-4-pet.com](https://pet-4-pet.com)