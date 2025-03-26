---
layout: post
title: "Cookies Are Stateless!"
date: 2025-03-25 17:14:06 -0000
category: Auth from backend perspective
tags: [auth, authorization]
description: "Cookies are stateless? Yes, same as JWT. I got tired to see how people compare these two. Cookies is just delivery mechanism, you as a dev make it stateful or stateless. In this article I will demonstrate why Cookies are stateless same way as JWT."
thumbnail: /assets/2025-03-26-cookies-are-stateless/logo.png
thumbnailwide: /assets/2025-03-26-cookies-are-stateless/logo-wide.png
---

* TOC
{:toc}


<br>

## **Why you may want to read the article**

I have seen people comparing Cookies and JWT million times. Usually, people claim that Cookies are a stateful authentication mechanism, while JWT is stateless.

First, this is completely incorrect - **Cookies and authentication using Cookies can be stateless**, and I will demonstrate this today.

Second, comparing JWT and Cookies is flawed from the start, as they are two entirely different concepts.




<br>

## **What is Cookie**

In short, cookies are a mechanism for transferring pieces of information between the server and the client over the HTTP protocol, along with other mechanisms such as query parameters, the body, headers, etc.

However, cookies have some peculiarities that distinguish them from the others.

Traditionally, cookies are initiated by the server in the sense that the server tells the browser which cookie to set, when it should expire, its scope, etc. After this, whenever you make an HTTP request to this server, the browser will send the cookie along. To send the cookie, the browser uses a header called “Cookie,” which is a special header.

The flow is the following:


[![alt_text](/assets/2025-03-26-cookies-are-stateless/image3.png "image_tooltip")](/assets/2025-03-26-cookies-are-stateless/image3.png "image_tooltip"){:target="_blank"}


1. Browser does not have cookies for this origin (for simplicity assume origin=domain).

2. Browser sends request to Server, and the Server replies with Set-Cookie header, which forces browser to set cookie for the domain of the server.

3. Cookies appear to be saved for this origin (domain), and now will be subsequently sent on each request to the server.




<br>

## **Stateful authentication**

There are a few methods for saving authentication information so that the user is not prompted to log in again. One of these methods is using a session ID. The flow is as follows



* Browser authenticates the user by sending credentials to the server
* The server checks the credentials and saves the authentication information, called sessions, in the database or in memory. It then returns the session ID in the cookies to the browser.
* The browser sends the session ID in the cookies with each subsequent request. The server then checks whether the session ID exists and verifies that the user is authenticated

In this way, the authentication is stateful, as the session  is stored on the server, the browser only sends the id of the session. It means that if you kill the server or erase the database - all users will be signed out, however the browser sends the same requests with the same session id.




<br>

## **Why Cookie is not stateful**

As you can see, if you choose a stateful authentication method, it doesn't matter whether you use cookies, headers, or the body — it’s still stateful.

The main point here is that cookies are not an authentication method; they are a way to save and transfer information between the browser/client and the server.

To make it stateless, stop using session-based authentication. As an alternative, you could still use JWT authentication with cookies. This way, you are using JWT as usual, but instead of localStorage and headers, you’re using cookies.

Note: You should still be aware of the peculiarities of cookies, such as the fact that they are per origin (domain). This could cause issues if you're trying to integrate a React Single Page Application with an authorization server.




<br>

## **Demo: JWT with Cookies (stateless cookies auth)**

In this demo we will create a .NET auth server. It will issue JWT and validate JWT via cookies. As a client we are going to use Swagger.

The full repo with a demo can be found in my [Github](https://github.com/andreyka26-git/andreyka26-authorizations/tree/main/SimpleAuth/Cookie.BackendOnly).

First: create a simple .NET API. It will have 2 endpoints. 





<br>

### **Issue JWT via cookies**

For issuing JWT - we are using a standard approach: create claims, get the private key and sign them. Then we return 200 OK with JWT in Cookies.

```cs
        [HttpPost("customcookie/login")]
        public async Task<IActionResult> LoginAsync([FromBody] LoginDto req)
        {
            var user = await BackendOnly.User.AuthenticateUser(req.UserName, req.Password);
            if (user == null)
            {
                return BadRequest("Cannot authenticate user");
            }

            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.Name, user.Email),
                new Claim("FullName", user.FullName),
                new Claim(ClaimTypes.Role, "Administrator"),
            };

            var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(Key));
            var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: JwtIssuer,
                audience: JwtAudience,
                claims: claims,
                expires: DateTime.Now.AddHours(1),
                signingCredentials: credentials
            );

            var tokenString = new JwtSecurityTokenHandler().WriteToken(token);

            Response.Cookies.Append("myAuthCookie", tokenString, new CookieOptions
            {
                HttpOnly = true,
                Secure = true,
                SameSite = SameSiteMode.Strict,
                Expires = DateTime.Now.AddHours(1)
            });

            return Ok();
        }
```




<br>

### **Validate JWT via cookies**

To validate the JWT, we are validating the signature of JWT that we got from Cookies.

```cs
        [HttpGet("auth/validate")]
        public IActionResult ValidateToken()
        {
            if (!Request.Cookies.TryGetValue("myAuthCookie", out var tokenString))
            {
                return Unauthorized();
            }

            var tokenHandler = new JwtSecurityTokenHandler();

            var validationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = JwtIssuer,
                ValidAudience = JwtAudience,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(Key))
            };

            try
            {
                var principal = tokenHandler.ValidateToken(tokenString, validationParameters, out var validatedToken);
                var claims = principal.Claims.Select(c => new
                {
                    Type = c.Type,
                    Value = c.Value
                });

                return Ok(new
                {
                    Message = "Token is valid",
                    Claims = claims
                });
            }
            catch
            {
                return Unauthorized();
            }
        }
```

<br>

### **Add Swagger for client**

Make sure you added Swagger in DI registration: 


```cs

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(o =>
{
    o.SwaggerDoc("v1", new OpenApiInfo
    {
        Version = "v1",
        Title = "Auth sample",
        Description = "For auth use andreyka26_ as login and Mypass1* as password"
    });
});

app.UseSwagger();
app.UseSwaggerUI();

```

<br>

### **Demo**

First, we call validate endpoint to make sure we are not authenticated, as we don’t have cookies set. 

[![alt_text](/assets/2025-03-26-cookies-are-stateless/image2.png "image_tooltip")](/assets/2025-03-26-cookies-are-stateless/image2.png "image_tooltip"){:target="_blank"}


Then let’s authenticate. In my case I’m checking 1 hardcoded login+pass pair.


[![alt_text](/assets/2025-03-26-cookies-are-stateless/image5.png "image_tooltip")](/assets/2025-03-26-cookies-are-stateless/image5.png "image_tooltip"){:target="_blank"}


We can see that our cookie was set in the browser.


[![alt_text](/assets/2025-03-26-cookies-are-stateless/image4.png "image_tooltip")](/assets/2025-03-26-cookies-are-stateless/image4.png "image_tooltip"){:target="_blank"}


Now our validate endpoint will show us claims in the token, that is from Cookie.


[![alt_text](/assets/2025-03-26-cookies-are-stateless/image1.png "image_tooltip")](/assets/2025-03-26-cookies-are-stateless/image1.png "image_tooltip"){:target="_blank"}


Now, this is a completely stateless approach, as our JWT is self contained, and all servers that know the correct private key - are able to validate it. It means that we can easily scale our servers, respawn or kill them.

