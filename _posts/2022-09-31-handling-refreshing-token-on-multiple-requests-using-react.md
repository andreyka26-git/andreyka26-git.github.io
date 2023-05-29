---
layout: post
title: "Handling refresh token for multiple requests using React"
date: 2022-09-31 11:02:35 -0000
category: ["Authorization guides"]
tags: [guides, authorization, tutorials]
description: "In this article we will discuss handling refreshing tokens for SPA (single page applicaitons). Typically we have pair Access/Refresh token. We keep using Access Token. When Access Token is expired we need to refresh it. But we should do it only once, because in most implementations Refresh token is for single use. Thep roblem we will solve here is how we can stop all expired (with 401 status) requests and retry them only after the token is refreshed by one of the requests."
thumbnail: /assets/2022-09-31-handling-refreshing-token-on-multiple-requests-using-react/logo.png
thumbnailwide: /assets/2022-09-31-handling-refreshing-token-on-multiple-requests-using-react/logo-wide.png
---

* TOC
{:toc}

<!-- Output copied to clipboard! -->

<!-----

You have some errors, warnings, or alerts. If you are using reckless mode, turn it off to see inline alerts.
* ERRORs: 0
* WARNINGs: 0
* ALERTS: 6

Conversion time: 2.299 seconds.


Using this Markdown file:

1. Paste this output into your source file.
2. See the notes and action items below regarding this conversion run.
3. Check the rendered output (headings, lists, code blocks, tables) for proper
   formatting and use a linkchecker before you publish this page.

Conversion notes:

* Docs to Markdown version 1.0β33
* Thu Dec 08 2022 19:54:36 GMT-0800 (PST)
* Source doc: Handling refreshing token on multiple requests using React
* This document has images: check for >>>>>  gd2md-html alert:  inline image link in generated source and store images to your server. NOTE: Images in exported zip file from Google Docs may not appear in  the same order as they do in your doc. Please check the images!

----->



## **Why you may want to read this article**

To be honest, I am a pure backend guy, so all feedbacks are welcome on my social media. That said, the article will be about tackling authorization problems from a Frontend perspective.

Lately, I was implementing authentication on React client for one of my startups. So I had to ensure each request uses a Bearer token. If it is expired - then I need to refresh it and retry all requests. 

The main issue here is to `ensure that ALL REQUESTS with expired tokens are stopped until it is refreshed and retried AFTER it refreshed`. I spent a lot of time to achieve this and couldn’t find anything useful by Googling. 

I saw a lot of examples about how to do refreshing and retry for ONLY ONE request. But usually, the app sends more than 1 request to the server and refreshing all of them is not a good approach.

If it matches your problem - then this article will be useful for you.

<br>


## **Problem**

We are given:



1.  The Backend that is able to issue Access Token and Refresh Token. It also can verify Access Tokens provided by himself and exchange Refresh Token for new Access/Refresh Token pair.
2. The Frontend, is implemented using React (does not matter much). It has Api calls that should be authorized, so we should include Access Token to get data instead of 401. The Frontend is storing tokens somewhere (local storage in our case), which does not matter much as well.

Initially, if local storage is empty - then it loads the login page and authenticates the user (sends a request to the Server to get Access/Refresh tokens).


Once tokens are stored - we just include them alongside all requests that require Authorization. But once the token became expired the server will return us a 401 status code meaning that the token is invalid or expired.

Usually, the Frontend app, especially React SPA sends a lot of requests in parallel to load data parallelly on the page. This makes things even worse.

The steps that should be taken in this case are:



1. Stop all requests that failed with Expired Token error
2. Get new Access/Refresh token pair by exchanging our current Refresh Token.
3. Retry all requests that we stored.

In the network tab it should look like that:

[![alt_text](/assets/2022-09-31-handling-refreshing-token-on-multiple-requests-using-react/image2.png "image_tooltip")](/assets/2022-09-31-handling-refreshing-token-on-multiple-requests-using-react/image2.png "image_tooltip"){:target="_blank"}




We have sent 3 requests with an invalid token and got 401 for all of them, only ONCE we did refreshing the token, then retry all requests.


<br>


## **Solution**

I got some suggestions that we can use `expired` field in JWT token to safely refresh the token before it is expired. But unfortunately, it might break if Authorization Server supports Revoking tokens feature.

One example of this behavior is inside the OAuth protocol

[RFC reference](https://www.rfc-editor.org/rfc/rfc6749)

[![alt_text](/assets/2022-09-31-handling-refreshing-token-on-multiple-requests-using-react/image4.png "image_tooltip")](/assets/2022-09-31-handling-refreshing-token-on-multiple-requests-using-react/image4.png "image_tooltip"){:target="_blank"}


Going forward - we will have the ability to intercept each request and handle errors for each request.

The expected behavior that we will try to achieve is the following:



1. When the first request catches a 401 error - it sends a refresh token request.
2. Subsequent requests that caught a 401 error are waiting while the tokens are refreshed
3. Once the token is refreshed by the first request we retry the first request again. If during refreshing or retrying the requests we got 401 - it means something is wrong with tokens and we just logout (drop stored tokens and serve login page for user).
4. After successful retrying of the first request - we retry all waiting requests that caught 401 error after the first request


<br>

### **Frontend**

[Source code](https://github.com/andreyka26-git/andreyka26-authorizations/tree/main/Custom/JwtAuth.Custom.BackendOnly.Client)

First, create simple React app by using

```

npx create-react-app my-app

```

`index.js:`

```javascript

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

```

`App.js:`

```javascript

import { BrowserRouter, Routes, Route } from "react-router-dom";
import './App.css';

//pages

import HomePage from "./pages/Home"
import LoginPage from "./pages/Login"

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

`/pages/Login.js:`

```javascript

import React, { useState } from 'react';
import { authenticate } from '../services/Api'

function LoginPage() {
    const [userName, setUserName] = useState("andreyka26_");
    const [password, setPassword] = useState("Mypass1*");

    async function handleSubmit(event) {
        event.preventDefault();
        const [token, refreshToken] = await authenticate(userName, password);
    
        localStorage.setItem("token", token);
        localStorage.setItem("refreshToken", refreshToken);

        window.location = `${window.location.origin}/`;
    }

    function handleUserNameChange(event) {
        setUserName({value: event.target.value});
    }

    function handlePasswordhange(event) {
        setPassword({value: event.target.value});
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

In home page we will retrieve protected resource information in the page. On top of that, we added a button that will send 3 requests in a row and show the result  for each of them.

By doing that we are simulating SPA behavior that loads a lot of resources at the same time.

`pages/Home.js`:

```javascript

import React, { useState, useEffect } from 'react';
import { getResources } from '../services/Api'

function HomePage() {
    const [data, setData] = useState("default");
    const [first, setFirst] = useState("default");
    const [second, setSecond] = useState("default");
    const [third, setThird] = useState("default");

    useEffect(() => {
        async function prefetch() {
            const response = await getResources();
            console.log(response);
            setData(response);
        }

        prefetch();
    });

    async function sendRequests() {
        getResources().then(data => {
            console.log('first ' + data)
            setFirst(data)
        }).catch(err => {
            console.log('error on first req' + err)
        });

        getResources().then(data => {
            console.log('second ' + data)
            setSecond(data)
        }).catch(err => {
            console.log('error on second req' + err)
        });

        getResources().then(data => {
            console.log('third ' + data)
            setThird(data)
        }).catch(err => {
            console.log('error on third req' + err)
        });
    }

    return (
        <div>
            <button onClick={sendRequests}>Send 3 requests</button>
            Home Page {data}
            <br />
            <br />
            First resp: {first}
            <br />
            Second resp: {second}
            <br />
            Third resp: {third}
        </div>
    );
}

export default HomePage;

```

Before adding Api.js - add `axios` library. This library is needed for HTTP calls.

```

npm install axios

```

`/services/Api.js`:

```javascript

import axios from 'axios';

function isUnauthorizedError(error) {
    const {
        response: { status, statusText },
    } = error;
    return status === 401;
}

export async function authenticate(userName, password) {
    const loginPayload = {
        userName: userName,
        password: password
    };

    const response = await axios.post("https://localhost:7000/authorization/token", loginPayload);
    
    const token = response.data.authorizationToken;
    const refreshToken = response.data.refreshToken;

    return [token, refreshToken];
}

export async function renewToken() {
    const refreshToken = localStorage.getItem("refreshToken");

    if (!refreshToken)
        throw new Error('refresh token does not exist');

    const refreshPayload = {
        refreshToken: refreshToken
    };

    const response = await axios.post("https://localhost:7000/authorization/refresh", refreshPayload);
    const token = response.data.authorizationToken;

    const newRefreshToken = response.data.refreshToken;

    return [token, newRefreshToken];
}

export async function getResources() {
    const headers = withAuth();

    const options = {
        headers: headers
    }

    const response = await axios.get("https://localhost:7000/api/resources", options);
    const data = response.data;

    console.log(`got resources ${data}`);

    return data;
}

function withAuth(headers) {
    const token = localStorage.getItem("token");

    if (!token) {
        window.location = `${window.location.origin}/login`;
        return;
    }

    if (!headers) {
        headers = { };
    }

    headers.Authorization = `Bearer ${token}`

    return headers
}

```

In our case I think functions `authenticate`, `renewToken` are not that important. The implementation could vary a lot. In our case for authenticate - we are exchanging user credentials for Access/Refresh tokens, and for renewToken - we are exchanging current RefreshToken for new Access/Refresh tokens.

Note, that in my backend implementation Refresh is single per user. That’s why we cannot refresh for each request because Refresh token is valid only once.

<br>


#### **Interceptor Solution**

Let's add the following piece of code on top of `Api.js`:

```javascript

let refreshingFunc = undefined;

axios.interceptors.response.use(
    (res) =>  res,
    async (error) => {
        const originalConfig = error.config;
        const token = localStorage.getItem("token");
        
        // if we don't have token in local storage or error is not 401 just return error and break req.
        if (!token || !isUnauthorizedError(error)) {
            return Promise.reject(error);
        }

        try {
            // the trick here, that `refreshingFunc` is global, e.g. 2 expired requests will get the same function pointer and await same function.
            if (!refreshingFunc)
                refreshingFunc = renewToken();
                
            const [newToken, newRefreshToken] = await refreshingFunc;

            localStorage.setItem("token", newToken);
            localStorage.setItem("refreshToken", newRefreshToken);

            originalConfig.headers.Authorization = `Bearer ${newToken}`;

            // retry original request
            try {
                return await axios.request(originalConfig);
            } catch(innerError) {
                // if original req failed with 401 again - it means server returned not valid token for refresh request
                if (isUnauthorizedError(innerError)) {
                    throw innerError;
                }                  
            }

        } catch (err) {
            localStorage.removeItem("token");
            localStorage.removeItem("refreshToken");

            window.location = `${window.location.origin}/login`;

        } finally {
            refreshingFunc = undefined;
        }
    },
)

```

Interceptor is a kind of cross-cutting feature in `axios` library. It intercepts each request. For us, it is important to intercept the error.

`error.config` is our initial request object for `axios` library. We can retry this request by using `await axios.request(error.config);`

As explained above on the first request we try to refresh the token. To make other requests wait for refresh token - we will start `renewToken` function, and assign Promise to `refreshingFunc` variable that is out of interceptor.

Any other request with expired token that will enter interceptor sees that `refreshingFunc` is already set so it awaits result as well, and then use new tokens from the awaited result.

After setting new token we just retry original request with it. If the response is still 401 - then something wrong with both tokens - just logout the user.


<br>

### **Backend**

[Source code](https://github.com/andreyka26-git/andreyka26-authorizations/tree/main/Custom/JwtAuth.Custom.BackendOnly.Server)

I will show `getToken` and `refreshToken` methods.

`AuthorizationController`:


```cs
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

    var resp = await GenerateAuthorizationTokenAsync(user.Id, user.UserName);

    return Ok(resp);
}

[HttpPost("authorization/refresh")]
public async Task<ActionResult<AuthorizationResponse>> GetAuthorizationTokenFromRefreshAsync([FromBody] RefreshTokenRequest request,
    CancellationToken cancellationToken)
{
    var now = DateTime.UtcNow;

    var refreshToken = await _authContext.RefreshTokens
            .Include(r => r.User)
            .SingleOrDefaultAsync(r => r.Value == request.RefreshToken, cancellationToken);

    if (refreshToken == null)
        throw new Exception("refresh token is not found");

    var response = await GenerateAuthorizationTokenAsync(refreshToken.User.Id, refreshToken.User.UserName);

    return Ok(response);
}

private async Task<AuthorizationResponse> GenerateAuthorizationTokenAsync(string userId, string userName)
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

    var refreshToken = await _authContext.RefreshTokens.SingleOrDefaultAsync(r => r.ApplicationUserId == userId);

    if (refreshToken != null)
    {
        _authContext.RefreshTokens.Remove(refreshToken);
    }

    var user = await _authContext.Users.SingleOrDefaultAsync(u => u.Id == userId);
    var newRefreshToken = new RefreshToken(Guid.NewGuid().ToString(), TimeSpan.FromDays(1000), userId);

    newRefreshToken.User = user;

    _authContext.RefreshTokens.Add(newRefreshToken);
    await _authContext.SaveChangesAsync();

    var resp = new AuthorizationResponse
    {
        UserId = userId,
        AuthorizationToken = encodedJwt,
        RefreshToken = newRefreshToken.Value
    };

    return resp;
}
```

In this example those are not that important. We are using Identity framework for user management. The default user is seeded during the startup.

The authentication process is going through the Identity Nuget. You might check [my article](https://andreyka26.com/auth-from-backend-percpective-pt1-basics) about authentication and authorization.

For our application, I’m keeping only 1 refresh token alive per user.

In `GetTokenAsync` we just checking user existence and issuing Access/Refresh token.

In `GetAuthorizationTokenFromRefreshAsync` we are removing the existing refresh token and creating a new one. After it, we retrieve new Refresh/Access tokens.

`ResourcesController`:

```cs

[ApiController]
public class ResourcesController : ControllerBase
{
    [HttpGet("api/resources")]
    [Authorize()]
    public IActionResult GetResources()
    {
        return Ok($"protected resources, username: {User.Identity!.Name}");
    }
}
```


<br>

## **Demo**

And for sure the demo.

Launch Backend and Frontend.

The first page has empty local storage:


[![alt_text](/assets/2022-09-31-handling-refreshing-token-on-multiple-requests-using-react/image6.png "image_tooltip")](/assets/2022-09-31-handling-refreshing-token-on-multiple-requests-using-react/image6.png "image_tooltip"){:target="_blank"}


After submitting default credentials we have access and refresh token inside the localstorage.



[![alt_text](/assets/2022-09-31-handling-refreshing-token-on-multiple-requests-using-react/image3.png "image_tooltip")](/assets/2022-09-31-handling-refreshing-token-on-multiple-requests-using-react/image3.png "image_tooltip"){:target="_blank"}


Now, let’s break access token by submitting `localStorage.setItem("token", "sdf")` inside Browser Console. 

[![alt_text](/assets/2022-09-31-handling-refreshing-token-on-multiple-requests-using-react/image1.png "image_tooltip")](/assets/2022-09-31-handling-refreshing-token-on-multiple-requests-using-react/image1.png "image_tooltip"){:target="_blank"}




Ensure that the token is not valid, and then click `Send 3 requests`.



[![alt_text](/assets/2022-09-31-handling-refreshing-token-on-multiple-requests-using-react/image5.png "image_tooltip")](/assets/2022-09-31-handling-refreshing-token-on-multiple-requests-using-react/image5.png "image_tooltip"){:target="_blank"}


You could observe, that the first 3 requests failed with 401, ONLY ONE refresh request happened and all 3 `resources` requests were retried successfully. We can observe that each response was set for each retried request.


## **Acknowledgments & Feedback**

I would like to say thank you to all my friends that are working as Frontend /Js software engineers for help in solving this problem and writing this article:


[https://www.linkedin.com/in/svirgunvolodia/](https://www.linkedin.com/in/svirgunvolodia/)

[https://www.linkedin.com/in/vasyl-lok-215305164/](https://www.linkedin.com/in/vasyl-lok-215305164/)

[https://www.linkedin.com/in/oleksandr-melnyk-93644218a/](https://www.linkedin.com/in/oleksandr-melnyk-93644218a/)

[https://www.linkedin.com/in/oleksandr-ostapchuk-a923b8197/](https://www.linkedin.com/in/oleksandr-ostapchuk-a923b8197/)

Inspired by [https://github.com/Flyrell/axios-auth-refresh](https://github.com/Flyrell/axios-auth-refresh)

Highly encouraged to leave your feedback regarding this solution in my social media.


Thank you for your attention!
