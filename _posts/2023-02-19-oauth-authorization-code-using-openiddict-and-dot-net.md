---
layout: post
title: "OAuth Authorization Code using OpenIddict and .NET"
date: 2023-02-19 11:02:35 -0000
category: ["Authorization guides"]
tags: [authorization]
description: "In this article we are going to implement OAuth Authorization Code Grant, using .NET and OpenIddict library. We will comply with official RFC during implementation. Note, this article does not cover OpenId Connect implementationm only OAuth2 protocol implementation"
---

* TOC
{:toc}

<!-- Copy and paste the converted output. -->

<!-----

You have some errors, warnings, or alerts. If you are using reckless mode, turn it off to see inline alerts.
* ERRORs: 0
* WARNINGs: 0
* ALERTS: 5

Conversion time: 4.209 seconds.


Using this Markdown file:

1. Paste this output into your source file.
2. See the notes and action items below regarding this conversion run.
3. Check the rendered output (headings, lists, code blocks, tables) for proper
   formatting and use a linkchecker before you publish this page.

Conversion notes:

* Docs to Markdown version 1.0β34
* Mon Feb 20 2023 06:46:34 GMT-0800 (PST)
* Source doc: OAuth Authorization Code using OpenIddict and .NET
* This document has images: check for >>>>>  gd2md-html alert:  inline image link in generated source and store images to your server. NOTE: Images in exported zip file from Google Docs may not appear in  the same order as they do in your doc. Please check the images!

----->



## **Why you may want to read this article**

In this article we are going to implement `OAuth Authorization Code Grant`, using .NET and `OpenIddict` library. We will comply with [official RFC](https://www.rfc-editor.org/rfc/rfc6749) during implementation.

In particular, we will implement `Authorization Server` and `Resource Server` along with Swagger Client acting as an OAuth client, performing OAuth authorization, and sending requests to Resource Server.

Putting it more simply - our implementation will act the same as big OAuth / OpenId Connect providers: Google Authorization, Github Authorization, and Microsoft Authorization.

It will be possible to add somewhere `Sign in with …` button, like you might have seen: “Sign in with Google”, “Sign in with Facebook”, etc, but using your Authorization Server.

You can read about the `OAuth` overview and how it works [here](https://andreyka26.com/auth-from-backend-perspective-pt3-oauth-basics), this article is a particular step-by-step guide about how to build actual implementation using particular instruments.

The source code of the sample is located [here](https://github.com/andreyka26-git/dot-net-samples/tree/main/AuthorizationSample/OAuthAndOpenIdConnect/OAuth.OpenIddict.AuthorizationServer).

<br>

## **OpenIddict**

As an authorization library, I have chosen `OpenIddict`. There are different reasons for that.

We can see different alternatives for `OAuth / OpenId Connect` implementation like: `Identity Server`, Keycloak, Azure AD B2C, Ory Hydra, Auth0, etc.


The thing is that the majority of them are standalone products, SaaS, or self-hosted:


[![alt_text](/assets/2023-02-19-oauth-authorization-code-using-openiddict-and-dot-net/image1.png "image_tooltip")](/assets/2023-02-19-oauth-authorization-code-using-openiddict-and-dot-net/image1.png "image_tooltip"){:target="_blank"}


The real flexibility comes with libraries, and there are 2 main competitors: `Identity Server` and `OpenIddict`.

On top of that Identity Server is not a free solution anymore for commercial products.

I faced OpenIddict twice already in real projects.

All the time it is a little bit of a pain, because OpenIddict is not well documented.

The official documentation is [here](https://documentation.openiddict.com/). Also, there is [source code](https://github.com/openiddict/openiddict-core), and[ samples](https://github.com/openiddict/openiddict-samples) that are not usually cover your case or explain anything. 

There were a lot of cases where I just looked at the sample and had no idea why it is implemented as it is implemented.

This brought me to the idea to create this guide for the future.


<br>

## **Flow overview**

We are going to use



*  [Razor Pages](https://learn.microsoft.com/en-us/aspnet/core/razor-pages/?view=aspnetcore-7.0&tabs=visual-studio), which is a server-side, page-focused framework that enables building dynamic, data-driven websites. We will need it to show HTML, forms, and process data submitted from them. It simplifies such security concerns as `anti-forgery tokens` to prevent CSRF by default.
* [ASP NET Core API](https://learn.microsoft.com/en-us/aspnet/core/tutorials/first-web-api?view=aspnetcore-7.0&tabs=visual-studio), which is a framework to create Web API. In our case, these will be stateless endpoints for authorization, token, and logout. Though some of the requests rely on cookies, they are still stateless, because we do not use sessions, conversely - cookies are the encrypted data itself.

There are 5 main use cases to implement:

1) `Authorize endpoint` (Backend endpoint), which is the entry point and will redirect to other endpoints and use cases. Authorize endpoint is responsible to verify Resource Owner’s identity and verify Resource Owner has granted access to the Client.

2) `Authenticate endpoint` (Razor Pages), which is responsible to authenticate the Resource Owner: show login page, verify login & password are correct, and sign in using cookies. 

3) `Consent endpoint` (Razor Pages), which is responsible for prompting Resource Owner to allow or deny access to the Client.

4) `Token endpoint` (Backend endpoint) will exchange Authorization Code for Access Token.

5) `Logout endpoint` (Backend endpoint) will sign out from authentication cookies

6) `Resource endpoint` (Backend endpoint) will show user info from JWT token claims.

We are using Razor Pages in `Authenticate ` and `Consent` cases - because we would like to have CSRF protection with anti-forgery tokens. For sure it is possible to generate HTML from the pure backend and return it as text/html. But then we would be responsible for anti-forgery token management.

Unfortunately, it is not possible to split  `Authenticate ` and `Consent` use cases to some fancy SPA frameworks like `Angular` or `React` and leave pure backend on .NET, because:



* Authorization Server should be responsible for authorization and token issuing and authentication + consent according to OAuth2 RFC docs as a single server. For sure for scalability, it could be replicated, but as a single instance anyway. 
* Authentication cookies should be available in authorize endpoints, meaning the domain and port should be the same.
* Allowing another frontend web app to gather login + password and then send it over the network to the authorization server (pure backended)  adds another security risk.


<br>

## **Authorization Server**

The Authorization Server will be responsible for authenticating Resource Owner, verifying consent from Resource Owner, and issuing the tokens to the Clients.

The authorization Server will listen to the 7000 port.


### **1. Create ASP NET Core Web App**

Create using whatever tool is more convenient for you.
I'm using Visual Studio.

### **2. Add the necessary Nuget packages**

```

Npgsql

Npgsql.EntityFrameworkCore.PostgreSQL

OpenIddict.AspNetCore

OpenIddict.EntityFrameworkCore

System.Linq.Async

Microsoft.EntityFrameworkCore.Design

```

As you can see, we are going to use my favorite database called `Postgres`. You can find useful articles about how to set up and work with it [here](https://andreyka26.com/postgres-with-docker-local-development) and [here](https://andreyka26.com/postgres-backup-to-email-and-telegram).

`Microsoft.EntityFrameworkCore.Design` is only used for `Add-Migration` command. It is not necessary.


<br>

### **3. Add [global constants](https://github.com/andreyka26-git/dot-net-samples/blob/main/AuthorizationSample/OAuthAndOpenIdConnect/OAuth.OpenIddict.AuthorizationServer/Consts.cs)**

```cs

public class Consts
{
   public const string Email = "email";
   public const string Password = "password";
   public const string ConsentNaming = "consent";
   public const string GrantAccessValue = "Grant";
   public const string DenyAccessValue = "Deny";
}
```


<br>

### **4. Add [Authenticate page model](https://github.com/andreyka26-git/dot-net-samples/blob/main/AuthorizationSample/OAuthAndOpenIdConnect/OAuth.OpenIddict.AuthorizationServer/Pages/Authenticate.cshtml.cs) and [html page](https://github.com/andreyka26-git/dot-net-samples/blob/main/AuthorizationSample/OAuthAndOpenIdConnect/OAuth.OpenIddict.AuthorizationServer/Pages/Authenticate.cshtml)**

```cs

public class AuthenticateModel : PageModel
{
   public string Email { get; set; } = Consts.Email;

   public string Password { get; set; } = Consts.Password;

   [BindProperty]
   public string? ReturnUrl { get; set; }

   public string AuthStatus { get; set; } = "";

   public IActionResult OnGet(string returnUrl)
   {
      ReturnUrl = returnUrl;
      return Page();
   }
   
   public async Task<IActionResult> OnPostAsync(string email, string password)
   {
      if (email != Consts.Email || password != Consts.Password)
      {
            AuthStatus = "Email or password is invalid";
            return Page();
      }

      var claims = new List<Claim>
      {
            new(ClaimTypes.Email, email),
      };

      var principal = new ClaimsPrincipal(
            new List<ClaimsIdentity> 
            {
               new(claims, CookieAuthenticationDefaults.AuthenticationScheme)
            });

      await HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, principal);

      if (!string.IsNullOrEmpty(ReturnUrl))
      {
            return Redirect(ReturnUrl);
      }

      AuthStatus = "Successfully authenticated";
      return Page();
   }
}
```

```html

@page

@model OAuth.AuthorizationServer.Pages.AuthenticateModel

@*Please do not forget to add tag helper*@

@addTagHelper *, Microsoft.AspNetCore.Mvc.TagHelpers

@{

}

Authenticate

<div>@Model.AuthStatus</div>
<div>Return url: @Model.ReturnUrl</div>

<form method="post">
    <input name="email" value="@Model.Email"/>
    <input name="password" value="@Model.Password" />
    <input type="submit" />
</form>

```

This page will be needed in our `Authorize` endpoint. In case the Resource Owner is not authenticated we will redirect him to `Authenticate` page. We are saving ReturnUrl to be able to return Resource Owner back to `Authorize` endpoint but with authentication cookies set.

In reality, in our `OnPostAsync`method we need to check Resource Owner’s login and password against your database (usually using the Identity library), and then set cookies with `await HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, principal);`

To know what is going on in the `HttpContext.SignInAsync` you could read [my article](https://andreyka26.com/dot-net-auth-internals-pt2-cookies) about Cookies Auth internals in .NET.

In our case let’s pretend that if the `email == Consts.Email` and `password == Consts.Password ` - the user is valid and stored in our database.


<br>

### **5. Add [Consent page model](https://github.com/andreyka26-git/dot-net-samples/blob/main/AuthorizationSample/OAuthAndOpenIdConnect/OAuth.OpenIddict.AuthorizationServer/Pages/Consent.cshtml.cs) and [html page](https://github.com/andreyka26-git/dot-net-samples/blob/main/AuthorizationSample/OAuthAndOpenIdConnect/OAuth.OpenIddict.AuthorizationServer/Pages/Consent.cshtml)**

```cs

[Authorize]
public class Consent : PageModel
{
    [BindProperty]
    public string? ReturnUrl { get; set; }
    
    public IActionResult OnGet(string returnUrl)
    {
        ReturnUrl = returnUrl;
        return Page();
    }

    public async Task<IActionResult> OnPostAsync(string grant)
    {
        if (grant == Consts.GrantAccessValue)
        {
            var consentClaim = User.GetClaim(Consts.ConsentNaming);
            if (string.IsNullOrEmpty(consentClaim))
            {
                User.SetClaim(Consts.ConsentNaming, Consts.GrantAccessValue);
                await HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, User);
            }

            return Redirect(ReturnUrl);
        }

        return Forbid(OpenIddictServerAspNetCoreDefaults.AuthenticationScheme);
    }
}

```

```html

@page

@using OAuth.AuthorizationServer

@model OAuth.AuthorizationServer.Pages.Consent

@*Please do not forget to add tag helper*@

@addTagHelper *, Microsoft.AspNetCore.Mvc.TagHelpers

@{
    Layout = null;
}

Consent

Redirect url: @Model.ReturnUrl

<form method="post">
    <input type="submit" name="grant" value="@Consts.GrantAccessValue">
    <input type="submit" name="grant" value="@Consts.DenyAccessValue"/>
</form>

```

Consent page is needed in our `Authorize` endpoint as well. Once Resource Owner is authenticated - according to OAuth2 RFC docs we need to ensure that Resource Owner consents particular client to access its data.

We are going to get Consent from the submitted HTML form, and if it has ‘Grant’ value - we will override authentication cookies with a new value, that will represent Resource Owner’s consent.

You can see `[Authorize]` attribute, meaning, that the request already contains authentication cookies. In our case, it will contain only one Claim with the email `ClaimTypes.Email`. In `OnPostAsync` we will add a new claim with `Consts.ConsentNaming` name representing Resource Owner’s consent.

Then we redirect the user back to Authorize endpoint with both Authentication and Consent set in cookies.

Alternative solutions:



* Usually in [OpenIddict samples](https://github.com/openiddict/openiddict-samples/blob/dev/samples/Velusia/Velusia.Server/Controllers/AuthorizationController.cs#L186), consent processing happens in the same `connect/authorize` Controller route that allows just continue authorization without redirection. For us it does not work, because we will not have access to OpenIddict request on our Razor page (we are not in authorize, or token route)
* Another alternative is to pass Consent value (Grant or Deny) to Authorize Controller. But pure API Controllers do not validate the Antiforgery tokens. It is possible but will lead to security issues.


<br>

### **6. Add the [AuthorizationController](https://github.com/andreyka26-git/dot-net-samples/blob/main/AuthorizationSample/OAuthAndOpenIdConnect/OAuth.OpenIddict.AuthorizationServer/Controllers/AuthorizationController.cs)**

```cs

[ApiController]
public class AuthorizationController : Controller
{
   private readonly IOpenIddictApplicationManager _applicationManager;
   private readonly IOpenIddictAuthorizationManager _authorizationManager;
   private readonly IOpenIddictScopeManager _scopeManager;
   private readonly AuthorizationService _authService;

   public AuthorizationController(
      IOpenIddictApplicationManager applicationManager,
      IOpenIddictAuthorizationManager authorizationManager,
      IOpenIddictScopeManager scopeManager,
      AuthorizationService authService)
   {
      _applicationManager = applicationManager;
      _authorizationManager = authorizationManager;
      _scopeManager = scopeManager;
      _authService = authService;
   }
}

```


<br>

#### **6.1 Add Authorize endpoint as described [in rfc](https://www.rfc-editor.org/rfc/rfc6749#section-3.1)**

```cs

[HttpGet("~/connect/authorize")]
[HttpPost("~/connect/authorize")]

public async Task<IActionResult> Authorize()
{
   var request = HttpContext.GetOpenIddictServerRequest() ??
                  throw new InvalidOperationException("The OpenID Connect request cannot be retrieved.");

   var parameters = _authService.ParseOAuthParameters(HttpContext, new List<string> { Parameters.Prompt });
   var result = await HttpContext.AuthenticateAsync(CookieAuthenticationDefaults.AuthenticationScheme);

   if (!_authService.IsAuthenticated(result, request))
   {
         return Challenge(properties: new AuthenticationProperties
         {
            RedirectUri = _authService.BuildRedirectUrl(HttpContext.Request, parameters)
         }, new[] { CookieAuthenticationDefaults.AuthenticationScheme });
   }

   var application = await _applicationManager.FindByClientIdAsync(request.ClientId) ??
                     throw new InvalidOperationException("Details concerning the calling client application cannot be found.");

   var consentClaim = result.Principal.GetClaim(Consts.ConsentNaming);

   if (consentClaim != Consts.GrantAccessValue)
   {
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
   identity.SetDestinations(AuthorizationService.GetDestinations);

   return SignIn(new ClaimsPrincipal(identity), OpenIddictServerAspNetCoreDefaults.AuthenticationScheme);
}

```

The flow here is the following:



* We check whether the Resource Owner is Authenticated (has authentication cookies with data inside it). If not - we redirect him to `Authenticate` page with `return Challenge`
* We check whether Resource Owner parsed from Authentication cookies contains `Consent` claim. If not - we redirect him to `Consent` page that will set `Consent` claim to cookies
* We create a new identity and sign in it with `OpenIddictServerAspNetCoreDefaults.AuthenticationScheme`. It will redirect us to `ReturnUrl` with `authorization code`. 

From the OpenIddict source code, it could do different things with the same `SignIn` operation. For example, for the `authorize endpoint` it will redirect to ReturnUrl with Authorization Code, for `token endpoint` it will issue a new Access Token and return it to the Client.


<br>

#### **6.2 Token Endpoint as described in [rfc](https://www.rfc-editor.org/rfc/rfc6749#section-3.2)**

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
            properties: new AuthenticationProperties(new Dictionary<string, string>
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

   identity.SetDestinations(AuthorizationService.GetDestinations);

   return SignIn(new ClaimsPrincipal(identity), OpenIddictServerAspNetCoreDefaults.AuthenticationScheme);
}

```

This endpoint is used to exchange Authorization Code for Access Token (and maybe Id Token or Refresh Token).

We are retrieving the identity that we put when signing in with `OpenIddictServerAspNetCoreDefaults.AuthenticationScheme`. We are signing in this identity again with up-to-date token claim destinations. This time `SignIn` will issue Tokens and possibly set cookies.



<br>

#### **6.3 Logout endpoint**

```cs

[HttpPost("~/connect/logout")]
public async Task<IActionResult> LogoutPost()
{
   await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);

   return SignOut(
         authenticationSchemes: OpenIddictServerAspNetCoreDefaults.AuthenticationScheme,
         properties: new AuthenticationProperties
         {
            RedirectUri = "/"
         });
}

```

The Logout endpoint is straightforward - we are signing out from `CookieAuthenticationDefaults.AuthenticationScheme` (Authentication / Consent), and then we are signing out from `OpenIddictServerAspNetCoreDefaults.AuthenticationScheme` (Authorization).


<br>

### **7. Create [Clients and Resources DbSeeder](https://github.com/andreyka26-git/dot-net-samples/blob/main/AuthorizationSample/OAuthAndOpenIdConnect/OAuth.OpenIddict.AuthorizationServer/ClientsSeeder.cs)**

```cs

public class ClientsSeeder
{

   private readonly IServiceProvider _serviceProvider;

   public ClientsSeeder(IServiceProvider serviceProvider)
   {
      _serviceProvider = serviceProvider;
   }

   public async Task AddScopes()
   {

      await using var scope = _serviceProvider.CreateAsyncScope();
      var manager = scope.ServiceProvider.GetRequiredService<IOpenIddictScopeManager>();
      var apiScope = await manager.FindByNameAsync("api1");

      if (apiScope != null)
      {
            await manager.DeleteAsync(apiScope);
      }

      await manager.CreateAsync(new OpenIddictScopeDescriptor
      {
            DisplayName = "Api scope",
            Name = "api1",
            Resources =
            {
               "resource_server_1"
            }
      });
   }

   public async Task AddClients()
   {

      await using var scope = _serviceProvider.CreateAsyncScope();
      var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

      await context.Database.EnsureCreatedAsync();

      var manager = scope.ServiceProvider.GetRequiredService<IOpenIddictApplicationManager>();
      var client = await manager.FindByClientIdAsync("web-client");

      if (client != null)
      {
            await manager.DeleteAsync(client);
      }

      await manager.CreateAsync(new OpenIddictApplicationDescriptor
      {
            ClientId = "web-client",
            ClientSecret = "901564A5-E7FE-42CB-B10D-61EF6A8F3654",
            ConsentType = ConsentTypes.Explicit,
            DisplayName = "Postman client application",
            RedirectUris =
            {
               new Uri("https://localhost:7002/swagger/oauth2-redirect.html")
            },
            PostLogoutRedirectUris =
            {
               new Uri("https://localhost:7002/resources")
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
}

```

This seeder will create our client called `web-client` without PKCE, setting the redirect URL to `[https://localhost:7002/swagger/oauth2-redirect.html](https://localhost:7002/swagger/oauth2-redirect.html)` as default Swagger redirect URL for  OAuth2 / OpenId Connect.

On top of that, it will create Resource Server as a scope with name `api1` and resource name `resource_server_1`. And to allow the client to use this Scope we added `{Permissions.Prefixes.Scope}api1` to permissions.


<br>

### **8. Register Services in [Program](https://github.com/andreyka26-git/dot-net-samples/blob/main/AuthorizationSample/OAuthAndOpenIdConnect/OAuth.OpenIddict.AuthorizationServer/Program.cs)**

```cs

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<ApplicationDbContext>(options =>
{
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"));
    options.UseOpenIddict();
});

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
                .SetTokenEndpointUris("connect/token");

        options.RegisterScopes(Scopes.Email, Scopes.Profile, Scopes.Roles);

        options.AllowAuthorizationCodeFlow();

        options.AddEncryptionKey(new SymmetricSecurityKey(
            Convert.FromBase64String("DRjd/GnduI3Efzen9V9BvbNUfc/VKgXltV7Kbk9sMkY=")));

        options.AddDevelopmentEncryptionCertificate()
                .AddDevelopmentSigningCertificate();

        options.UseAspNetCore()
                .EnableAuthorizationEndpointPassthrough()
                .EnableLogoutEndpointPassthrough()
                .EnableTokenEndpointPassthrough();
    });

builder.Services.AddTransient<AuthorizationService>();

builder.Services.AddControllers();
builder.Services.AddRazorPages();

builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(c =>
    {
        c.LoginPath = "/Authenticate";
    });

builder.Services.AddTransient<ClientsSeeder>();

builder.Services.AddEndpointsApiExplorer();

builder.Services.AddSwaggerGen();

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy => 
    {
        policy.WithOrigins("https://localhost:7002")
            .AllowAnyHeader(); 
    });
});

var app = builder.Build();

```

We added DbContext for OpenIddict and registered all OpenIddict services:



* Allowed authorize, logout, and token endpoints
* Added default scopes
* Allowed Authorization Code grant only
* Added Symmetric key for token signing (this is one of the ways to validate signed tokens on Resource Server side)

On top of that we have registered our `AuthorizationService`, and `ClientsSeeder`.

We have added Cookie authentication with our login path pointing to `Authenticate` Razor Page described above.

Added Cors to allow Swagger to call `token` endpoint.


<br>

### **9. Use Registered services and Middlewares in [Program](https://github.com/andreyka26-git/dot-net-samples/blob/main/AuthorizationSample/OAuthAndOpenIdConnect/OAuth.OpenIddict.AuthorizationServer/Program.cs)**

```cs

using (var scope = app.Services.CreateScope())
{
    var seeder = scope.ServiceProvider.GetRequiredService<ClientsSeeder>();
    seeder.AddClients().GetAwaiter().GetResult();
    seeder.AddScopes().GetAwaiter().GetResult();
}
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseCors();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapRazorPages();

app.Run();

```

The second part of Program.cs is using all registered services and middlewares.

First of all we are seeding clients and scopes with resources, used https redirection, cors, and controllers with Razor Pages.


<br>

### **10. Add Migrations**

Run `Add-Migration Initial` from your `Package Manager Console` in Visual Studio, or create the migration using any convenient tool for you

It will create migration files:



* [Designer file](https://github.com/andreyka26-git/dot-net-samples/blob/main/AuthorizationSample/OAuthAndOpenIdConnect/OAuth.OpenIddict.AuthorizationServer/Migrations/20230220133625_Initial.Designer.cs)
* [Migration file](https://github.com/andreyka26-git/dot-net-samples/blob/main/AuthorizationSample/OAuthAndOpenIdConnect/OAuth.OpenIddict.AuthorizationServer/Migrations/20230220133625_Initial.cs)
* [Snapshot file](https://github.com/andreyka26-git/dot-net-samples/blob/main/AuthorizationSample/OAuthAndOpenIdConnect/OAuth.OpenIddict.AuthorizationServer/Migrations/ApplicationDbContextModelSnapshot.cs)

These migrations will be applied in Seeder on `EnsureCreated` step.


<br>

## **Resource Server**

The Resource Server is going to have protected endpoints that the Client will call with Access Token issued with Resource Owner’s permission.

Resource Server also will serve Swagger UI, so it is both the Client and Resource Server at the same time. But you could use Postman as a Client as well, or create a real web/mobile app to act as a Client

Resource Server will listen to 7002 port.


<br>

### **1. Add Nuget packages**

```

OpenIddict.Validation.AspNetCore

OpenIddict.Validation.SystemNetHttp

```


<br>

### **2. Add [ResourceController](https://github.com/andreyka26-git/dot-net-samples/blob/main/AuthorizationSample/OAuthAndOpenIdConnect/OAuth.OpenIddict.ResourceServer/Controllers/ResourceController.cs)**

```cs

[ApiController]
[Route("resources")]
public class ResourceController : Controller
{
    [Authorize]
    [HttpGet]
    public async Task<IActionResult> GetSecretResources()
    {
        var user = HttpContext.User?.Identity?.Name;
        return Ok($"user: {user}");
    }
}

```

This endpoint is a simple one - to verify we have our user authenticated with all necessary claims - we are going to show the user id parsed from token claims.


<br>

### **3. Register and use services in [Program](https://github.com/andreyka26-git/dot-net-samples/blob/main/AuthorizationSample/OAuthAndOpenIdConnect/OAuth.OpenIddict.ResourceServer/Program.cs)**

```cs

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

builder.Services.AddOpenIddict()
    .AddValidation(options =>
    {
        options.SetIssuer("https://localhost:7000/");
        options.AddAudiences("resource_server_1");

        options.AddEncryptionKey(new SymmetricSecurityKey(
            Convert.FromBase64String("DRjd/GnduI3Efzen9V9BvbNUfc/VKgXltV7Kbk9sMkY=")));

        options.UseSystemNetHttp();
        options.UseAspNetCore();
    });

builder.Services.AddAuthentication(OpenIddictValidationAspNetCoreDefaults.AuthenticationScheme);
builder.Services.AddAuthorization();

builder.Services.AddEndpointsApiExplorer();

builder.Services.AddSwaggerGen(c =>
{
    c.AddSecurityDefinition("oauth2", new OpenApiSecurityScheme
    {
        Type = SecuritySchemeType.OAuth2,
        Flows = new OpenApiOAuthFlows
        {
            AuthorizationCode = new OpenApiOAuthFlow
            {
                AuthorizationUrl = new Uri("https://localhost:7000/connect/authorize"),
                TokenUrl = new Uri("https://localhost:7000/connect/token"),
                Scopes = new Dictionary<string, string>
                {
                    { "api1", "resource server scope" }
                }
            },
        }
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "oauth2" }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.OAuthClientId("web-client");
    c.OAuthClientSecret("901564A5-E7FE-42CB-B10D-61EF6A8F3654");
});

app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();

```

We have added OpenIddict validation services to be able to validate signed (and potentially encrypted) Access Token:



* Set issuer url to our Authorization Server
* Set audience to our registered resource
* Added the same symmetric key to be able to validate Signature of Access Token from Authorization Server.

We have registered OpenIddict Authentication which allows us to be able to validate JWT Access Tokens. We don’t add Authentication / Consent cookies authentication because it is only an Authorization Server concern according to RFC.

We have added Swagger, which will act as an OAuth2 client, so added OAuth2 `SecurityDefinition` and `SecurityRequirement`.

On the `UseSwaggerUI` we put our `web-client` credentials. They will be automatically populated in the UI.


<br>

## **DEMO**

Let’s launch both services.

Click `Authorize`


[![alt_text](/assets/2023-02-19-oauth-authorization-code-using-openiddict-and-dot-net/image5.png "image_tooltip")](/assets/2023-02-19-oauth-authorization-code-using-openiddict-and-dot-net/image5.png "image_tooltip"){:target="_blank"}


Click `Authorize` in the pop up window

It will go to `connect/authorize` **the first time**, see, that the request does not have `Authenticate` cookies, and redirect the Resource Owner to `Authenticate` razor page


[![alt_text](/assets/2023-02-19-oauth-authorization-code-using-openiddict-and-dot-net/image2.png "image_tooltip")](/assets/2023-02-19-oauth-authorization-code-using-openiddict-and-dot-net/image2.png "image_tooltip"){:target="_blank"}


Click `Submit`

It will sign in the user and set Authenticate cookies ( `.AspNetCore.Cookies`) - then redirect Resource Owner to `connect/authorize`.


[![alt_text](/assets/2023-02-19-oauth-authorization-code-using-openiddict-and-dot-net/image4.png "image_tooltip")](/assets/2023-02-19-oauth-authorization-code-using-openiddict-and-dot-net/image4.png "image_tooltip"){:target="_blank"}


 You might also see Antiforgery cookies are in place, they are needed to prevent CSRF vulnerability.

Now we try to go to `connect/authorize` **the second time**. Now with authenticated Resource Owner (authentication cookies in place).

But Cookies don’t contain `consent` value, so we are redirected to the consent page.

Click `Grant`, and after that, we try to go to `connect/authorize` the third time. Now with authenticated Resource Owner that granted access to its data.


[![alt_text](/assets/2023-02-19-oauth-authorization-code-using-openiddict-and-dot-net/image3.png "image_tooltip")](/assets/2023-02-19-oauth-authorization-code-using-openiddict-and-dot-net/image3.png "image_tooltip"){:target="_blank"}


This time we successfully authorized and got redirected to the Swagger Return URL with Authorization Code. 

Swagger then exchanges Authorization Code for Access Token, and internally most probably stores it somewhere.


<br>

## **Conclusion**

In this article we implemented OAuth 2 protocol using .NET and OpenIddict as a library.
We only covered OAuth 2 according to official RFC documentation and specification. OpenId Connect implementation follow-up will be in the next article.

Thank you for attention
