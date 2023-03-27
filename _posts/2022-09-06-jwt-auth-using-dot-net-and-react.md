---
layout: post
title: "JWT authentication and authorization using .NET and React"
date: 2022-09-06 10:05:35 -0000
category: ["Authorization guides"]
tags: [guides, authorization, dotnet, tutorials]
description: "In this article we will do the basic authentication and authorization using Backend (.NET + C#) and Frontend (React client). We will use JWT for this. This authorization and authentication will be similar to Resource Owner Password Credentials in OAuth, but custom one"
thumbnail: /assets/2022-09-06-jwt-auth-using-dot-net-and-react/logo.png
---

* TOC
{:toc}


<!-- Output copied to clipboard! -->

<!-----

You have some errors, warnings, or alerts. If you are using reckless mode, turn it off to see inline alerts.
* ERRORs: 0
* WARNINGs: 0
* ALERTS: 10

Conversion time: 4.219 seconds.


Using this Markdown file:

1. Paste this output into your source file.
2. See the notes and action items below regarding this conversion run.
3. Check the rendered output (headings, lists, code blocks, tables) for proper
   formatting and use a linkchecker before you publish this page.

Conversion notes:

* Docs to Markdown version 1.0β33
* Wed Sep 07 2022 00:55:03 GMT-0700 (PDT)
* Source doc: JWT authentication and authorization using .NET and React
* This document has images: check for >>>>>  gd2md-html alert:  inline image link in generated source and store images to your server. NOTE: Images in exported zip file from Google Docs may not appear in  the same order as they do in your doc. Please check the images!

----->

## **Why you may want to read this article**


This article is a simple guide about how to create JWT authorization using Backend pure (`.NET` + `Identity`) + Web Client (in our case `React`).


I saw this flow 2 times in commercial projects I was working on, it is simple, it is workable to some extent. It has drawbacks, but it is cheap to implement nonetheless.

In [Identity docs](https://learn.microsoft.com/en-us/aspnet/core/security/authentication/identity?view=aspnetcore-7.0&tabs=visual-studio), you can see Razor pages (custom UI) for auth. But usually it is not what you want to do, usually, you have a separated backend and frontend (Client Server architecture). So in this guide, we will do auth using the pure backend.

If you are looking for good client implementations it is not a guide for you, I mostly will discuss the backend part.

This article will touch on authentication and authorization concepts, so you could check articles about [auth basics](https://andreyka26.com/auth-from-backend-percpective-pt1-basics), [cookies auth in .NET](https://andreyka26.com/dot-net-auth-internals-pt2-cookies), [OAuth internals](https://andreyka26.com/auth-from-backend-perspective-pt3-oauth-basics)

<br>

## **Flow**

In this particular sample, our server acts similarly to the authorization server in `OAuth` protocol, and the flow looks like `Resource Owner Password Credentials` of `OAuth` ([rfc reference](https://www.rfc-editor.org/rfc/rfc6749#section-1.3.3)).

The resource server (or just endpoints) will be protected by authorization middleware that will check specific tokens called `JWT` (`JSON Web Token`).

JWT works in the following way (I simplify a lot):

- JWT consists of the user’s data called Claims (email, username, id, role, id). And this information is base64 encoded, it could be even encrypted in some authorization server implementations.
- Whenever we create JWT we create a signature based on this user data and add this signature to the payload.
- Whenever server gets the JWT it extracts this payload and creates the same signature using the secret it has. If the signatures are equal - you can trust this token and this user is valid.

The flow:

- The client tries to access some protected endpoint - it gets 401 UnAuthorized.
- The client redirects the user to the login page, the user fills in his username and password
- The client sends those credentials to the backend.
- The backend verifies the password using Identity.
- The backend creates JWT if the user exists and has the correct password.
- The client receives a response from the backend and tries to access protected endpoints with this token (in the header).

<br>

## **Backend**

For the backend, we need to create a project, identity, and database for it.

<br>

### **Database**

Create a Postgres database (I prefer through docker).

Here is [guide](https://andreyka26.com/postgres-with-docker-local-development) that covers all commands, so you can do it in few clicks.

```
docker volume create pgdata

docker run -p 5432:5432 --name postgres -v pgdata:/var/lib/postgresql/data -e POSTGRES_PASSWORD=root -e POSTGRES_USER=root -d postgres

```

In the end, you should have postgres running on a particular port, for simplicity, it is 5432 in my case.

[![alt_text](/assets/2022-09-06-jwt-auth-using-dot-net-and-react/image6.png "image_tooltip")](/assets/2022-09-06-jwt-auth-using-dot-net-and-react/image6.png "image_tooltip"){:target="_blank"}

<br>

### **API**

[Source code](https://github.com/andreyka26-git/dot-net-samples/tree/main/AuthorizationSample/Custom/JwtAuth.Custom.BackendOnly.Server)


#### **1. Create pure Web API project**

For our purpose, I’ll name it “Server”.

`VS` -> `Create a new project` -> `ASP.NET Core Web API` -> (fill in name and location) -> configure HTTPS checked -> `Create`

Install a bunch of nuggets:

Install `Microsoft.AspNetCore.Identity.EntityFrameworkCore` NuGet.

Install `Npgsql.EntityFrameworkCore.PostgreSQL` NuGet.

Install `Microsoft.AspNetCore.Authentication.JwtBearer` NuGet.

Install `Microsoft.AspNetCore.Identity.UI` NuGet.

Install `Microsoft.AspNetCore.Authentication.JwtBearer` NuGet.

Install `Microsoft.EntityFrameworkCore.Design` NuGet (for running the DB migrations).

Install `Microsoft.EntityFrameworkCore.Tools` NuGet (for running the DB migrations).

Also set the `application URL` (local application URL) to "applicationUrl": "[https://localhost:7000](https://localhost:7000)".

You can do that in `Properties` -> `launchSettings.json`

<br>

#### **2. Add EF context**

`AuthContex.cs`

[Source code](https://github.com/andreyka26-git/dot-net-samples/blob/main/AuthorizationSample/Custom/JwtAuth.Server/AuthContext.cs)

```cs
public class AuthContext : IdentityDbContext<IdentityUser>
{
    public AuthContext(DbContextOptions<AuthContext> options)
        : base(options)
    {

    }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
    }
}

```

Then patch settings

`appsettings.json`

[Source code](https://github.com/andreyka26-git/dot-net-samples/blob/main/AuthorizationSample/Custom/JwtAuth.Server/appsettings.json)

```json
{
  "Secret": "secret*secret123secret444",

  "ConnectionStrings": {
    "AuthContextConnection": "Host=127.0.0.1;Port=5432;Database=AuthSampleDb5;Username=root;Password=root"
  }
}
```

Lets create another file for our default username and login

`Consts.cs`

[Source code](https://github.com/andreyka26-git/dot-net-samples/blob/main/AuthorizationSample/Custom/JwtAuth.Server/Consts.cs)

```cs

public class Consts
{
    public const string UserName = "andreyka26_";
    public const string Password = "Mypass1*";
}

```

<br>

#### **3. Patch Program class**

`Progam.cs`

[Source code](https://github.com/andreyka26-git/dot-net-samples/blob/main/AuthorizationSample/Custom/JwtAuth.Server/Program.cs)

Add swagger (with authentication for jwt)

```cs

builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "PetForPet.Api", Version = "v1" });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = @"JWT Authorization header using the Bearer scheme. \r\n\r\n
                      Enter 'Bearer' [space] and then your token in the text input below.
                      \r\n\r\nExample: 'Bearer 12345abcdef'",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement()
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                },
                Scheme = "oauth2",
                Name = "Bearer",
                In = ParameterLocation.Header
            },
            new List<string>()
        }
    });
});

```

Register auth services and middlewares

```cs

var connectionString = builder.Configuration.GetConnectionString("AuthContextConnection");

builder.Services.AddDbContext<AuthContext>(options => options.UseNpgsql(connectionString));
builder.Services.AddDefaultIdentity<IdentityUser>(options => options.SignIn.RequireConfirmedAccount = false)
    .AddEntityFrameworkStores<AuthContext>();

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(x =>
{
    var secret = builder.Configuration.GetValue<string>("Secret");
    var key = new SymmetricSecurityKey(Encoding.ASCII.GetBytes(secret));
    x.RequireHttpsMetadata = true;
    x.SaveToken = true;
    x.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        ValidAudience = "https://localhost:7000/",
        ValidIssuer = "https://localhost:7000/",
        IssuerSigningKey = key,
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };
});

```

Then after

```cs
var app = builder.Build();
```

Put the code to use our registered auth and swagger middlewares:

```cs

app.UseCors(builder =>
{
    builder
        .AllowAnyOrigin()
        .AllowAnyMethod()
        .AllowAnyHeader();
});

app.UseSwagger();
app.UseSwaggerUI();

app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

using (var scope = app.Services.CreateScope())
using (var userManager = scope.ServiceProvider.GetRequiredService<UserManager<IdentityUser>>())
using (var db = scope.ServiceProvider.GetRequiredService<AuthContext>())
{
    db.Database.Migrate();
    var user = await userManager.FindByNameAsync(Consts.UserName);

    if (user == null)
    {
        user = new IdentityUser(Consts.UserName);
        await userManager.CreateAsync(user, Consts.Password);
    }
}

app.Run();

```

On top of that we created seeding the database ot make it autocreate and created default user.

<br>

#### **4. Create Resource Controller**

[Source code](https://github.com/andreyka26-git/dot-net-samples/blob/main/AuthorizationSample/Custom/JwtAuth.Server/Controllers/ResourcesController.cs)

This endpoint is our protected by authorization endpoint. It will user JWT to authorize the request.

```cs

[ApiController]
public class ResourcesController : ControllerBase
{
    [HttpGet("api/resources")]
    [Authorize]
    public IActionResult GetResources()
    {
        return Ok($"protected resources, username: {User.Identity!.Name}");
    }
}

```

<br>

#### **5. Create Authorization Endpoint with password creds**

Prior to that let’s create some request and response DTOs.

`GetTokenRequest`

```cs

public class GetTokenRequest
{
    public string UserName { get; set; } = Consts.UserName;
    public string Password { get; set; } = Consts.Password;
}

```

`AuthorizationResponse`

```cs

public class AuthorizationResponse
{
    public string UserId { get; set; }
    public string AuthorizationToken { get; set; }
    public string RefreshToken { get; set; }
}

```

`AuthorizationController`

[Source code](https://github.com/andreyka26-git/dot-net-samples/blob/main/AuthorizationSample/Custom/JwtAuth.Server/Controllers/AuthorizationController.cs)

`AuthorizationController.GenerateAuthorizationToken`

```cs

private AuthorizationResponse GenerateAuthorizationToken(string userId, string userName)
{
    var now = DateTime.UtcNow;
    var secret = _configuration.GetValue<string>("Secret");
    var key = new SymmetricSecurityKey(Encoding.ASCII.GetBytes(secret));

    var userClaims = new List<Claim>
    {
        new Claim(ClaimsIdentity.DefaultNameClaimType, userName),
        new Claim(ClaimTypes.NameIdentifier, userId),
    };

    //userClaims.AddRange(roles.Select(r => new Claim(ClaimsIdentity.DefaultRoleClaimType, r)));

    var expires = now.Add(TimeSpan.FromMinutes(60));

    var jwt = new JwtSecurityToken(
            notBefore: now,
            claims: userClaims,
            expires: expires,
            audience: "https://localhost:7000/",
            issuer: "https://localhost:7000/",
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));

    //we don't know about thread safety of token handler

    var encodedJwt = new JwtSecurityTokenHandler().WriteToken(jwt);

    var resp = new AuthorizationResponse
    {
        UserId = userId,
        AuthorizationToken = encodedJwt,
        RefreshToken = string.Empty
    };

    return resp;
}
```

This method will be used to create JWT and return it in well defined response DTO. In my previous case we need to have username and userid in the token claims therefore we expected them.

It creates the claims, puts them into JWT object, and signs it with our secret defined in appsettings.json.

Next step is to create endpoint for standard credential based auth

`AuthorizationController.GetTokenAsync`

```cs

private readonly UserManager<IdentityUser> _userManager;
private readonly SignInManager<IdentityUser> _signInManager;
private readonly IUserStore<IdentityUser> _userStore;
private readonly IUserEmailStore<IdentityUser> _emailStore;
private readonly IConfiguration _configuration;

public AuthorizationController(UserManager<IdentityUser> userManager,
    IConfiguration configuration,
    SignInManager<IdentityUser> signInManager,
    IUserStore<IdentityUser> userStore)
{
    _userManager = userManager;
    _configuration = configuration;
    _signInManager = signInManager;
    _emailStore = (IUserEmailStore<IdentityUser>)userStore;
    _userStore = userStore;
}

[HttpPost("authorization/token")]
public async Task<IActionResult> GetTokenAsync([FromBody] GetTokenRequest request)
{
    var user = await _userManager.FindByNameAsync(request.UserName);

    if (user == null)
    {
        //401 or 404
        return Unauthorized();
    }

    var passwordValid = await _userManager.CheckPasswordAsync(user, request.Password);

    if (!passwordValid)
    {
        //401 or 400
        return Unauthorized();
    }

    var resp = GenerateAuthorizationToken(user.Id, user.UserName);

    return Ok(resp);
}

```

As you can see the behavior is simple: we check whether user with those credentials exists, check whether password matches, if yes - we generate JWT and return it for client.

<br>

#### **6. Add Migrations**

Go to Package Manager Console in Visual Studio.

Run this command:

```cs

Add-Migration Initial

```

<br>

### **Run and test**

Run the application locally. By following “[https://localhost:7000/swagger/index.html](https://localhost:7000/swagger/index.html)” you should be able to see swagger UI.

Try authorization endpoint with creds “andreyka26\_” and “Mypass1\*”

[![alt_text](/assets/2022-09-06-jwt-auth-using-dot-net-and-react/image7.png "image_tooltip")](/assets/2022-09-06-jwt-auth-using-dot-net-and-react/image7.png "image_tooltip"){:target="_blank"}

Now you could add this authorization token to header with “Bearer {token}” and run ResourceController.

[![alt_text](/assets/2022-09-06-jwt-auth-using-dot-net-and-react/image1.png "image_tooltip")](/assets/2022-09-06-jwt-auth-using-dot-net-and-react/image1.png "image_tooltip"){:target="_blank"}

And as response you could see that in controller our auth middleware successfully parsed username claim:

[![alt_text](/assets/2022-09-06-jwt-auth-using-dot-net-and-react/image8.png "image_tooltip")](/assets/2022-09-06-jwt-auth-using-dot-net-and-react/image8.png "image_tooltip"){:target="_blank"}

<br>

## **Frontend**

[Source code](https://github.com/andreyka26-git/dot-net-samples/tree/main/AuthorizationSample/Custom/JwtAuth.Custom.BackendOnly.Client)

This application does not cover referesh token behavior - it is explained in [this tutorial](https://andreyka26.com/handling-refreshing-token-on-multiple-requests-using-react).

First let’s create simple react application following the official documentation. Run the following commands like described [here](https://reactjs.org/docs/create-a-new-react-app.html)

<br>

### **Create app and install dependencies**

```js

npx create-react-app my-app

cd my-app

npm install axios --save
npm install react-router-dom --save

```

<br>

### **Add code**

`index.js`

```js
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
```

`App.js`

```js
import { BrowserRouter, Routes, Route } from "react-router-dom";

import "./App.css";

//pages

import HomePage from "./pages/Home";
import LoginPage from "./pages/Login";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
      </Routes>
    </BrowserRouter>
  );
}
```

Then create two files:

`pages/Home.js`

```js
import axios from "axios";
import React, { useState, useEffect } from "react";

function HomePage() {
  const [data, setData] = useState("default");

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }

    if (data == "default") {
      axios
        .get("https://localhost:7000/api/resources")
        .then((response) => {
          const data = response.data;

          setData(data);
        })
        .catch((err) => console.log(err));
    }
  });

  return <div>Home Page {data}</div>;
}

export default HomePage;
```

`pages/Login.js`

```js
import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function LoginPage() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("andreyka26_");
  const [password, setPassword] = useState("Mypass1*");

  function handleSubmit(event) {
    event.preventDefault();

    const loginPayload = {
      userName: userName,
      password: password,
    };

    axios
      .post("https://localhost:7000/authorization/token", loginPayload)
      .then((response) => {
        const token = response.data.authorizationToken;

        localStorage.setItem("token", token);

        if (token) {
          axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        }

        navigate("/");
      })
      .catch((err) => console.log(err));
  }

  function handleUserNameChange(event) {
    setUserName({ value: event.target.value });
  }

  function handlePasswordhange(event) {
    setPassword({ value: event.target.value });
  }

  return (
    <div>
      Login Page
      <form onSubmit={handleSubmit}>
        <label>
          User Name:
          <input type="text" value={userName} onChange={handleUserNameChange} />
        </label>
        <label>
          Password:
          <input type="text" value={password} onChange={handlePasswordhange} />
        </label>
        <input type="submit" value="Submit" />
      </form>
    </div>
  );
}

export default LoginPage;
```

<br>

## **Run together**

Run backend, pressing F5.

Run frontend by running npm start

Go to “[http://localhost:3000/login](http://localhost:3000/login)”, and press submit button.

In network tab you should be able to see token request:

[![alt_text](/assets/2022-09-06-jwt-auth-using-dot-net-and-react/image3.png "image_tooltip")](/assets/2022-09-06-jwt-auth-using-dot-net-and-react/image3.png "image_tooltip"){:target="_blank"}

[![alt_text](/assets/2022-09-06-jwt-auth-using-dot-net-and-react/image5.png "image_tooltip")](/assets/2022-09-06-jwt-auth-using-dot-net-and-react/image5.png "image_tooltip"){:target="_blank"}

And then the redirection to home page which queries our backend with this token:

[![alt_text](/assets/2022-09-06-jwt-auth-using-dot-net-and-react/image2.png "image_tooltip")](/assets/2022-09-06-jwt-auth-using-dot-net-and-react/image2.png "image_tooltip"){:target="_blank"}

[![alt_text](/assets/2022-09-06-jwt-auth-using-dot-net-and-react/image9.png "image_tooltip")](/assets/2022-09-06-jwt-auth-using-dot-net-and-react/image9.png "image_tooltip"){:target="_blank"}

In our case we can even see what is stored in our token because we don’t encrypt it. Go to `[https://jwt.io](https://jwt.io) `and paste there your token.

[![alt_text](/assets/2022-09-06-jwt-auth-using-dot-net-and-react/image4.png "image_tooltip")](/assets/2022-09-06-jwt-auth-using-dot-net-and-react/image4.png "image_tooltip"){:target="_blank"}

You can see our name and id claims we’ve created on token generation step in the backend. The same way you could add role and validate by role.

Thank you for your attention. In the next part, we will consider how to add Google Auth to this setup. It turned out that it is not easy at all.
