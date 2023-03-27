---
layout: post
title: "OpenId Connect Authorization Code using OpenIddict and .NET"
date: 2023-03-24 11:02:35 -0000
category: ["Authorization guides"]
tags: [authorization]
description: "In this article we are going to implement OAuth Authorization Code Grant, using .NET and OpenIddict library. We will comply with official RFC during implementation. Note, this article does not cover OpenId Connect implementationm only OAuth2 protocol implementation"
thumbnail: /assets/2023-03-24-openid-connect-authorization-code-using-openiddict-and-dot-net/logo.jpg
thumbnailwide: /assets/2023-03-24-openid-connect-authorization-code-using-openiddict-and-dot-net/logo-wide.png
---
<br>

* TOC
{:toc}
<!-- Output copied to clipboard! -->

<!-----

You have some errors, warnings, or alerts. If you are using reckless mode, turn it off to see inline alerts.
* ERRORs: 0
* WARNINGs: 0
* ALERTS: 6

Conversion time: 2.887 seconds.


Using this Markdown file:

1. Paste this output into your source file.
2. See the notes and action items below regarding this conversion run.
3. Check the rendered output (headings, lists, code blocks, tables) for proper
   formatting and use a linkchecker before you publish this page.

Conversion notes:

* Docs to Markdown version 1.0β34
* Fri Mar 24 2023 06:31:28 GMT-0700 (PDT)
* Source doc: OpenId Connect Authorization Code using OpenIddict and .NET
* This document has images: check for >>>>>  gd2md-html alert:  inline image link in generated source and store images to your server. NOTE: Images in exported zip file from Google Docs may not appear in  the same order as they do in your doc. Please check the images!

----->



## **Why you may want to read this article**

In the [previous article](https://andreyka26.com/oauth-authorization-code-using-openiddict-and-dot-net), we implemented the OAuth Authorization Code flow using OpenIddict and .NET. 

If you are looking for a simple Authorization Server implementation, you would like to set up proper access to Resource Servers and you don’t care about user identity, authentication, and unification of this process - it is better to take a look at [OAuth](https://andreyka26.com/oauth-authorization-code-using-openiddict-and-dot-net).

The main goals of [OpenId Connect](https://openid.net/specs/openid-connect-core-1_0.html) flow besides OAuth flow are: 



* `Resource Owner identity assertion and verification`
* `Serving authentication process result and additional information about it`
* `Serving User Information endpoint`

In this article, we will set up `OpenId Connect` compliant Authorization Server that will be able to manage authentication information, provide information about the user as well as to work with Access Tokens, and manage resources access.

During the implementation, I will explain all whats and whys according to official [OpenId Connect](https://openid.net/specs/openid-connect-core-1_0.html) and [OAuth](https://www.rfc-editor.org/rfc/rfc6749) documentation.

Disclaimer: This is not an overview of the protocol but rather a quick and simple guide with documentation references and explanations. If you would like to have a protocol overview - you could check my [OAuth protocol overview](https://andreyka26.com/auth-from-backend-perspective-pt3-oauth-basics).

The source code of the sample is located [here](https://github.com/andreyka26-git/dot-net-samples/tree/main/AuthorizationSample/OAuthAndOpenIdConnect/Oidc.OpenIddict.AuthorizationServer).

<br>

## **Why OpenIddict**

The full explanation is here: [OAuth using OpenIddict](https://andreyka26.com/oauth-authorization-code-using-openiddict-and-dot-net#openiddict).

Putting it shortly - [OpenIddict](https://github.com/openiddict/openiddict-core) is the one competitive and still free alternative to [Identity Server](https://identityserver4.readthedocs.io/en/latest/), pretty widely used, but not well documented. It is highly flexible, however with flexibility comes responsibility - so there are plenty of ways to do it incorrectly.

<br>

## **Flow overview**

The full sample is in this GitHub repository:



* [Authorization Server implementation](https://github.com/andreyka26-git/dot-net-samples/tree/main/AuthorizationSample/OAuthAndOpenIdConnect/Oidc.OpenIddict.AuthorizationServer)
* [Resource Server implementation](https://github.com/andreyka26-git/dot-net-samples/tree/main/AuthorizationSample/OAuthAndOpenIdConnect/Oidc.OpenIddict.ResourceServer1)

You could wonder whether we can implement OpenId Connect using Client-Server architecture with some fancy SPA frameworks like React / Angular.

The answer is NO, according to OAuth documentation, because separating UI into a separate physical entity (Client) will lead to security implications that OAuth is supposed to be solving.

Since `OpenId Connect Authorization Code` is built on top of `OAuth Authorization Code` flow with some additional behavior on top of that we will end up building OAuth flow first.

We are going to use



*  [Razor Pages](https://learn.microsoft.com/en-us/aspnet/core/razor-pages/?view=aspnetcore-7.0&tabs=visual-studio), which is a server-side, page-focused framework that enables building dynamic, data-driven websites. We will need it to show HTML, forms, and process data submitted from them. It simplifies such security concerns as `anti-forgery tokens` to prevent CSRF by default.
* [ASP NET Core API](https://learn.microsoft.com/en-us/aspnet/core/tutorials/first-web-api?view=aspnetcore-7.0&tabs=visual-studio), which is a framework to create Web API. In our case, these will be stateless endpoints for authorization, token, and logout. Though some of the requests rely on cookies, they are still stateless, because we do not use sessions, conversely - cookies are the encrypted data itself.


<br>

### **OAuth part**

The OAuth scope is described [here](https://andreyka26.com/oauth-authorization-code-using-openiddict-and-dot-net#flow-overview).


<br>

### **OpenId Connect part**

OpenId Connect extension built on top of OAuth includes:



* Extending Authorize endpoint parameters such as `response_mode`,  `prompt`
* Extend Token response with Id Token with authentication information. Putting it simply,  Id token will represent authentication and its result. On top of that, Id Token might contain User claims (Resource Owner’s data).
* Add UserInfo endpoint for profile information


<br>

## **Authorization Server**

<br>


### **OAuth part**

The OAuth flow guide is explained [here](https://andreyka26.com/oauth-authorization-code-using-openiddict-and-dot-net#authorization-server).


<br>

### **OpenId Connect part**


#### **1. Change [AuthorizeEndpoint](https://github.com/andreyka26-git/dot-net-samples/blob/main/AuthorizationSample/OAuthAndOpenIdConnect/Oidc.OpenIddict.AuthorizationServer/Controllers/AuthorizationController.cs#L33)**

```cs
[HttpGet("~/connect/authorize")]
[HttpPost("~/connect/authorize")]
public async Task<IActionResult> Authorize()
{
   var request = HttpContext.GetOpenIddictServerRequest() ??
                  throw new InvalidOperationException("The OpenID Connect request cannot be retrieved.");

   var application = await _applicationManager.FindByClientIdAsync(request.ClientId) ??
                     throw new InvalidOperationException("Details concerning the calling client application cannot be found.");

   if (await _applicationManager.GetConsentTypeAsync(application) != ConsentTypes.Explicit)
   {
         return Forbid(
            authenticationSchemes: OpenIddictServerAspNetCoreDefaults.AuthenticationScheme,
            properties: new AuthenticationProperties(new Dictionary<string, string?>
            {
               [OpenIddictServerAspNetCoreConstants.Properties.Error] = Errors.InvalidClient,
               [OpenIddictServerAspNetCoreConstants.Properties.ErrorDescription] =
                     "Only clients with explicit consent type are allowed."
            }));
   }

   var parameters = _authService.ParseOAuthParameters(HttpContext, new List<string> { Parameters.Prompt });

   var result = await HttpContext.AuthenticateAsync(CookieAuthenticationDefaults.AuthenticationScheme);

   if (!_authService.IsAuthenticated(result, request))
   {
         return Challenge(properties: new AuthenticationProperties
         {
            RedirectUri = _authService.BuildRedirectUrl(HttpContext.Request, parameters)
         }, new[] { CookieAuthenticationDefaults.AuthenticationScheme });
   }

   if (request.HasPrompt(Prompts.Login))
   {
         await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);

         return Challenge(properties: new AuthenticationProperties
         {
            RedirectUri = _authService.BuildRedirectUrl(HttpContext.Request, parameters)
         }, new[] { CookieAuthenticationDefaults.AuthenticationScheme });
   }

   var consentClaim = result.Principal.GetClaim(Consts.ConsentNaming);

   // it might be extended in a way that consent claim will contain list of allowed client ids.
   if (consentClaim != Consts.GrantAccessValue || request.HasPrompt(Prompts.Consent))
   {
         await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);

         var returnUrl = HttpUtility.UrlEncode(_authService.BuildRedirectUrl(HttpContext.Request, parameters));
         var consentRedirectUrl = $"/Consent?returnUrl={returnUrl}";

         return Redirect(consentRedirectUrl);
   }

   var userId = result.Principal.FindFirst(ClaimTypes.Email)!.Value;

   var identity = new ClaimsIdentity(
         authenticationType: TokenValidationParameters.DefaultAuthenticationType,
         nameType: Claims.Name,
         roleType: Claims.Role);

   identity.SetClaim(Claims.Subject, userId)
         .SetClaim(Claims.Email, userId)
         .SetClaim(Claims.Name, userId)
         .SetClaims(Claims.Role, new List<string> { "user", "admin" }.ToImmutableArray());

   identity.SetScopes(request.GetScopes());
   identity.SetResources(await _scopeManager.ListResourcesAsync(identity.GetScopes()).ToListAsync());
   identity.SetDestinations(c => AuthorizationService.GetDestinations(identity, c));

   return SignIn(new ClaimsPrincipal(identity), OpenIddictServerAspNetCoreDefaults.AuthenticationScheme);
}
```

Compared to OAuth implementation we have added few things:



* We are checking Client’s  (or Relying party’s) `consent type`. It is OpenIddict definition. It allows you to create consentless auth for Clients. I think that it does not comply fully with OAuth & OpenId Connect specifications, so we ensure that `consent type` is always `Explicit`. `Explicit consent type` means that at least once Resource Owner should grant access to the Client to allow the Client to access Resource Owner’s data.
* We are checking `prompt=login` parameter, which will require Resource Owner to relogin (authentication). This parameter should be used if Resource Owner is authenticated but Client wants it to be reauthenticated. In our case Resource Owner’s consent will be dropped as well.
* We are checking `prompt=consent` parameter, which will require Resource Owner (that should be authenticated already) to grant (or deny) consent to the Client.

By default in our Authorization Server, Resouce Owner MUST be authenticated and MUST grant access to the Client to allow it (the Client)  to use Resource Owner’s data. However, we support relogin and reconsent behavior.

`prompt=none ` is implicitly supported, because of statement above. If Resource Owner is not Authenticated and we got prompt=none from the Client - we will ignore it and just follow authentication and consent flows. In other cases, we will use Authentication Cookies and not prompt authentication and consent again.

`prompt=select_account` is not supported, because our sample is too simple and we don’t have a multiple-account feature.


<br>

#### **OpenIddict is not following specifications**

In official OpenIddict samples, there are [cases ](https://github.com/openiddict/openiddict-samples/blob/dev/samples/Velusia/Velusia.Server/Controllers/AuthorizationController.cs#L128)when the Client is allowed to access Resource Owner’s data without Resource Owner’s consent. It is possible in `ConsentType=Implicit` applications. 


1.[OpenId Connect specification about consent](https://openid.net/specs/openid-connect-core-1_0.html#Consent)

_`Once the End-User is authenticated, the Authorization Server MUST obtain an authorization decision before releasing information to the Relying Party. When permitted by the request parameters used, this MAY be done through an interactive dialogue with the End-User that makes it clear what is being consented`_

2.[OAuth specification (RFC)](https://www.rfc-editor.org/rfc/rfc6749#section-4.1)

_`The authorization server authenticates the resource owner (via the user-agent) and establishes whether the resource owner grants or denies the client's access request.`_

3.[Open Id Connect documentation](https://openid.net/specs/openid-connect-core-1_0.html#CodeFlowSteps)

_`Authorization Server obtains End-User Consent/Authorization`_

I have even raised [StackOverflow question](https://stackoverflow.com/questions/75756295/does-openiddict-violates-oauth-and-openid-connect-specifications/75761109?noredirect=1#comment133655447_75761109) regarding this and got some explanation.

<br>

#### **2. Change [AuthorizationService](https://github.com/andreyka26-git/dot-net-samples/blob/main/AuthorizationSample/OAuthAndOpenIdConnect/Oidc.OpenIddict.AuthorizationServer/AuthorizationService.cs)**

We will add destinations for identity token

```cs
public static List<string> GetDestinations(ClaimsIdentity identity, Claim claim)
{
   var destinations = new List<string>();

   if (claim.Type is OpenIddictConstants.Claims.Name or OpenIddictConstants.Claims.Email)
   {
      destinations.Add(OpenIddictConstants.Destinations.AccessToken);

      if (identity.HasScope(OpenIddictConstants.Scopes.OpenId))
      {
            destinations.Add(OpenIddictConstants.Destinations.IdentityToken);
      }
   }

   return destinations;
}
```

By default, OpenIddict will not include claims that identity (authenticated user information) has except `sub` claim that is entity’s (in our case User’s) identifier and required to be in both Access and Id tokens. 

Our behavior is simple, we add `name` and `email` claim to access token. If Identity has OpenId scope (that actually means, that the call is OpenId Connect not OAuth) - we add this scope to id token.


<br>

#### **3. Add oidc debugger to [ClientsSeeder](https://github.com/andreyka26-git/dot-net-samples/blob/main/AuthorizationSample/OAuthAndOpenIdConnect/Oidc.OpenIddict.AuthorizationServer/ClientsSeeder.cs)**

```cs
public async Task AddOidcDebuggerClient()
{
   await using var scope = _serviceProvider.CreateAsyncScope();

   var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
   await context.Database.EnsureCreatedAsync();

   var manager = scope.ServiceProvider.GetRequiredService<IOpenIddictApplicationManager>();

   var client = await manager.FindByClientIdAsync("oidc-debugger");
   if (client != null)
   {
         await manager.DeleteAsync(client);
   }

   await manager.CreateAsync(new OpenIddictApplicationDescriptor
   {
         ClientId = "oidc-debugger",
         ClientSecret = "901564A5-E7FE-42CB-B10D-61EF6A8F3654",
         ConsentType = ConsentTypes.Explicit,
         DisplayName = "Postman client application",
         RedirectUris =
         {
            new Uri("https://oidcdebugger.com/debug")
         },
         PostLogoutRedirectUris =
         {
            new Uri("https://oauth.pstmn.io/v1/callback")
         },
         Permissions =
         {
            Permissions.Endpoints.Authorization,
            Permissions.Endpoints.Logout,
            Permissions.Endpoints.Token,
            Permissions.GrantTypes.AuthorizationCode,
            Permissions.ResponseTypes.Code,
            Permissions.Scopes.Email,
            Permissions.Scopes.Profile,
            Permissions.Scopes.Roles,
            $"{Permissions.Prefixes.Scope}api1"
         },
         //Requirements =
         //{
         //    Requirements.Features.ProofKeyForCodeExchange
         //}
   });
}
```

And call it during database setup in [Program.cs](https://github.com/andreyka26-git/dot-net-samples/blob/main/AuthorizationSample/OAuthAndOpenIdConnect/Oidc.OpenIddict.AuthorizationServer/Program.cs)

```cs
using (var scope = app.Services.CreateScope())
{
    var seeder = scope.ServiceProvider.GetRequiredService<ClientsSeeder>();
    seeder.AddOidcDebuggerClient().GetAwaiter().GetResult();
    seeder.AddWebClient().GetAwaiter().GetResult();
    seeder.AddScopes().GetAwaiter().GetResult();
}
```


<br>

#### **4. Enable User Info endpoint in [Program.cs](https://github.com/andreyka26-git/dot-net-samples/blob/main/AuthorizationSample/OAuthAndOpenIdConnect/Oidc.OpenIddict.AuthorizationServer/Program.cs)**

```cs
builder.Services.AddOpenIddict()
    .AddCore(options =>
    {
        options.UseEntityFrameworkCore()
                .UseDbContext<ApplicationDbContext>();
    })
    .AddServer(options =>
    {
        options.SetAuthorizationEndpointUris("connect/authorize")
                .SetLogoutEndpointUris("connect/logout")
                .SetTokenEndpointUris("connect/token")
                .SetUserinfoEndpointUris("connect/userinfo");

        options.RegisterScopes(Scopes.Email, Scopes.Profile, Scopes.Roles);

        options.AllowAuthorizationCodeFlow();

        options.AddEncryptionKey(new SymmetricSecurityKey(
            Convert.FromBase64String("DRjd/GnduI3Efzen9V9BvbNUfc/VKgXltV7Kbk9sMkY=")));

        options.AddDevelopmentEncryptionCertificate()
                .AddDevelopmentSigningCertificate();

        options.UseAspNetCore()
                .EnableAuthorizationEndpointPassthrough()
                .EnableLogoutEndpointPassthrough()
                .EnableTokenEndpointPassthrough()
                .EnableUserinfoEndpointPassthrough();
    });
```


<br>

#### **5. Add User Info endpoint in [AuthorizeEndpoint](https://github.com/andreyka26-git/dot-net-samples/blob/main/AuthorizationSample/OAuthAndOpenIdConnect/Oidc.OpenIddict.AuthorizationServer/Controllers/AuthorizationController.cs)**

```cs
[HttpPost("~/connect/token")]
public async Task<IActionResult> Exchange()
{
   var request = HttpContext.GetOpenIddictServerRequest() ??
                  throw new InvalidOperationException("The OpenID Connect request cannot be retrieved.");

   if (!request.IsAuthorizationCodeGrantType() && !request.IsRefreshTokenGrantType())
         throw new InvalidOperationException("The specified grant type is not supported.");

   var result =
         await HttpContext.AuthenticateAsync(OpenIddictServerAspNetCoreDefaults.AuthenticationScheme);

   var userId = result.Principal.GetClaim(Claims.Subject);

   if (string.IsNullOrEmpty(userId))
   {
         return Forbid(
            authenticationSchemes: OpenIddictServerAspNetCoreDefaults.AuthenticationScheme,
            properties: new AuthenticationProperties(new Dictionary<string, string?>
            {
               [OpenIddictServerAspNetCoreConstants.Properties.Error] = Errors.InvalidGrant,
               [OpenIddictServerAspNetCoreConstants.Properties.ErrorDescription] =
                     "Cannot find user from the token."
            }));
   }

   var identity = new ClaimsIdentity(result.Principal.Claims,
         authenticationType: TokenValidationParameters.DefaultAuthenticationType,
         nameType: Claims.Name,
         roleType: Claims.Role);

   identity.SetClaim(Claims.Subject, userId)
         .SetClaim(Claims.Email, userId)
         .SetClaim(Claims.Name, userId)
         .SetClaims(Claims.Role, new List<string> { "user", "admin" }.ToImmutableArray());

   identity.SetDestinations(c => AuthorizationService.GetDestinations(identity, c));

   return SignIn(new ClaimsPrincipal(identity), OpenIddictServerAspNetCoreDefaults.AuthenticationScheme);
}
```

This endpoint should be protected with OpenIddict scheme (not with our Cookies authentication scheme). This will verify that the Client is accessing this endpoint with Access Token.

User Info endpoint is usually considered as an endpoint that will return additional data about the entity (User or Resource Owner) that is not contained in Id Token. 

Let’s say you got some default Id token that contain `sub` and `email`. But you would like to get some custom claim called `favourite_game`. You asking Authorization Server for Access Token with scope (let’s say `favourite_game_scope`) that grants you access to Resource Owner’s `favourite_game` claim.


With this access token, the Client will be able to query UserInfo endpoint and get this claim.


<br>

## **Resource Server**

OpenId Connect has nothing with Resource Servers, so for this guide, we don’t do it. However, since OpenId Connect is built on top of OAuth, our Authorization Server will be OAuth compliant as well. It means you can add Resource Server, configure it, and make it to accept only authorized requests.

To set up Resource Server - please follow my [OAuth article](https://andreyka26.com/oauth-authorization-code-using-openiddict-and-dot-net#resource-server)


<br>

## **DEMO**

To test OpenId Connect behavior we need to deal with `Id token` and actually see what it contains necessary claims. And separately we need to query `userinfo` endpoint.

So launch the Authorization Server application.


<br>

### **1. Id Token DEMO**

1.1 Go to the following url [https://oidcdebugger.com/](https://oidcdebugger.com/)

1.2 Put all necessary information about the client


[![alt_text](/assets/2023-03-24-openid-connect-authorization-code-using-openiddict-and-dot-net/image6.png "image_tooltip")](/assets/2023-03-24-openid-connect-authorization-code-using-openiddict-and-dot-net/image6.png "image_tooltip"){:target="_blank"}


1.3  After authenticating and granting consent (the same as in OAuth sample) - you will get a successful response in the callback URL


[![alt_text](/assets/2023-03-24-openid-connect-authorization-code-using-openiddict-and-dot-net/image1.png "image_tooltip")](/assets/2023-03-24-openid-connect-authorization-code-using-openiddict-and-dot-net/image1.png "image_tooltip"){:target="_blank"}


1.4 Open postman and create token request with authorization code you got in oidc-debugger


[![alt_text](/assets/2023-03-24-openid-connect-authorization-code-using-openiddict-and-dot-net/image4.png "image_tooltip")](/assets/2023-03-24-openid-connect-authorization-code-using-openiddict-and-dot-net/image4.png "image_tooltip"){:target="_blank"}


1.5 Copy paste id_token object from postman


[![alt_text](/assets/2023-03-24-openid-connect-authorization-code-using-openiddict-and-dot-net/image5.png "image_tooltip")](/assets/2023-03-24-openid-connect-authorization-code-using-openiddict-and-dot-net/image5.png "image_tooltip"){:target="_blank"}


1.6 Check all claims in [jwt.io](https://jwt.io/)


[![alt_text](/assets/2023-03-24-openid-connect-authorization-code-using-openiddict-and-dot-net/image3.png "image_tooltip")](/assets/2023-03-24-openid-connect-authorization-code-using-openiddict-and-dot-net/image3.png "image_tooltip"){:target="_blank"}


As you can see all the claims were added according to destinations and scope we have set.


<br>

### **2. UserInfo endpoint DEMO**

2.1 Copy and paste the Access Token from the previous Postman response

2.2 Call User Info endpoint with Access Token


[![alt_text](/assets/2023-03-24-openid-connect-authorization-code-using-openiddict-and-dot-net/image2.png "image_tooltip")](/assets/2023-03-24-openid-connect-authorization-code-using-openiddict-and-dot-net/image2.png "image_tooltip"){:target="_blank"}


As you can see the response from user info contains exactly our claims.

## Conclusion
In this article, we implemented OpenId Connect protocol using .NET and OpenIddict as a library. We also reviewed existing OpenIddict samples and their incompliance with OpenId Connect specification. In case you have anything to add to this guide, or you found some specfiication or any other violation - do not hesitate to contact me in [instagram](https://www.instagram.com/andreyka26_programmer/)/[telegram](https://t.me/programming_space)/[linkedin](https://www.linkedin.com/in/andrii-bui-a55b39166/).

Thank you for attention