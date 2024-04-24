---
layout: post
title: "OAuth Authorization Code React client pt1: OpenIddict"
date: 2024-01-02 11:02:35 -0000
category: ["Authorization guides"]
tags: [authorization, react-client, react, oauth, openidconnect]
description: "In this article we are going to create React client for our OAuth Server (OpenIddict). This client can be used by any OAuth provider or implementation such as Google or Github. In simple words we will implement this button 'sign in with X' with React"
thumbnail: /assets/2024-01-02-oauth-authorization-code-react-client-pt1-openIddict/logo.png
thumbnailwide: /assets/2024-01-02-oauth-authorization-code-react-client-pt1-openIddict/logo-wide.png
---
<br>

* TOC
{:toc}


<!-----

You have some errors, warnings, or alerts. If you are using reckless mode, turn it off to see inline alerts.
* ERRORs: 0
* WARNINGs: 0
* ALERTS: 5

Conversion time: 4.641 seconds.


Using this Markdown file:

1. Paste this output into your source file.
2. See the notes and action items below regarding this conversion run.
3. Check the rendered output (headings, lists, code blocks, tables) for proper
   formatting and use a linkchecker before you publish this page.

Conversion notes:

* Docs to Markdown version 1.0β35
* Wed Jan 03 2024 09:27:44 GMT-0800 (PST)
* Source doc: OAuth Authorization Code React client pt1: OpenIddict
* This document has images: check for >>>>>  gd2md-html alert:  inline image link in generated source and store images to your server. NOTE: Images in exported zip file from Google Docs may not appear in  the same order as they do in your doc. Please check the images!

----->



## **Why you may want to read this article**

This article will show you how to create a React client for any OAuth Server or OAuth provider. By saying “any” I mean that we create an **OAuth client** that can be reused with any other OAuth server or provider, regardless of what it is: **Instagram** (external), **Identity Server** (custom), **Google** (external), even your custom implementation of OAuth. 

We will implement exactly this button “Sign in with X”. In terms of OAuth flow we will be using Authorization Code flow which is one of the most secure, can can be used from web/mobile clients.

In our case we will not deal with the user details returned from it, because it is OAuth flow, not OpenId Connect. Instead of it, we will query the Resource Server with our token to demonstrate that it worked and we have successfully been authorized.


## **Prerequisite**

To be able to create an OAuth React client we need to have some OAuth Server or OAuth provider. This provider should implement and follow [OAuth protocol](https://andreyka26.com/auth-from-backend-perspective-pt3-oauth-basics). 
 
OAuth Server will give us a method to get authorization tokens, and we need a Resource Server with a protected endpoint to call with our token.

As an example you could follow this article: [OAuth Authorization Code using OpenIddict and .NET](https://andreyka26.com/oauth-authorization-code-using-openiddict-and-dot-net) to create your own OAuth Server. Or you can use any other famous Authorization Server with public API like [Github](https://docs.github.com/en/rest/using-the-rest-api/getting-started-with-the-rest-api?apiVersion=2022-11-28), [Google](https://console.cloud.google.com/apis/library), etc. 
For us it does not matter, our React Client can be used with any of them.


## **What we implement**

Our plan for today is to create React SPA (Single Page Application) that will have a “Sign in with andreyka” button. This button will be working the same way as typical “Sign in with X”. 
 
The client will have a protected endpoint which will show information from the protected endpoint in Resource Server.


## **Application design**

Our client has 3 routes:



* `/`  route is used for an unauthenticated page. This page will be used when the user didn’t authenticate before. The button “Login via andreyka26” is shown. The authentication process can be started by clicking this button the same way as “Login with Google”.
* `/resources` route is used for authenticated users. Resources information obtained from the Resource Server will be shown here along with the `Logout` button.
* `/oauth/callback` route is used for receiving redirection from Authorization Server with authorization code that we will exchange for access token. This route is not intended for users.

We will use standard react client architecture:



* `components` folder has all the reusable components, e.g. Protected route that will ensure that children components are shown only in case the user is authenticated.
* `pages` folder is for pages. `App.js` will be used as a page that shows Resource information `/resources`.
* `services` folder is for stuff related to auth and Resource Server API.
* `utils` for configuration and useful shared services.


## **Implementation**

All the source code is in the [repository](https://github.com/andreyka26-git/andreyka26-authorizations/tree/main/OAuthAndOpenIdConnect/OAuth.OpenIddict.WebClient) in Github.

I used [this article](https://andreyka26.com/oauth-authorization-code-using-openiddict-and-dot-net) to create an [Authorization Server](https://github.com/andreyka26-git/andreyka26-authorizations/tree/main/OAuthAndOpenIdConnect/OAuth.OpenIddict.AuthorizationServer) and [Resource Server](https://github.com/andreyka26-git/andreyka26-authorizations/tree/main/OAuthAndOpenIdConnect/OAuth.OpenIddict.ResourceServer) that I will be calling from my Client. 


First - we need to create React SPA. Just follow [official documentation](https://create-react-app.dev/docs/getting-started).

Then we need the npm library for authorization, because we don’t want to implement well known RFC specifications on our own. I wanted to find the client library that just follows OAuth and OpenId Connect protocols, but I usually saw clients for specific providers: Google, Github, etc. 

So It should be famous enough, with community support, abstract enough to work with custom OAuth Server, but flexible enough to be used in famous providers.

I used a library called [oidc-client-ts](https://www.npmjs.com/package/oidc-client-ts). They have decent [documentation](https://authts.github.io/oidc-client-ts/).


### **Install Dependencies**

```
npm install oidc-client-ts --save

npm install react-router-dom --save 
```


### **Add [utils/config.js](https://github.com/andreyka26-git/andreyka26-authorizations/blob/main/OAuthAndOpenIdConnect/OAuth.OpenIddict.WebClient/src/utils/config.js)**

```jsx
// custom settings that work with our ouwn OAuth server
const andreykaSettings = {
    authority: 'https://localhost:7000',
    client_id: 'react-client',
    client_secret: '901564A5-E7FE-42CB-B10D-61EF6A8F3654',
    redirect_uri: 'http://localhost:3000/oauth/callback',
    silent_redirect_uri: 'http://localhost:3000/oauth/callback',
    post_logout_redirect_uri: 'http://localhost:3000/',
    response_type: 'code',
    // this is for getting user.profile data, when open id connect is implemented
    //scope: 'api1 openid profile'
    // this is just for OAuth2 flow
    scope: 'api1'
};

export const andreykaConfig = {
    settings: andreykaSettings,
    flow: 'andreyka'
};
```


This file only has configurations needed for `oidc-client-ts` to perform OAuth flow.

`andreykaSettings` has settings that are specified in [official documentation of oidc-client-ts](https://authts.github.io/oidc-client-ts/interfaces/UserManagerSettings.html).

 
I aggregated this setting in my `andreykaConfig`. Later we can extend it to `googleConfig`, `githubConfig`, etc depending on OIDC or OAuth providers.


### **Add [services/AuthService.js](https://github.com/andreyka26-git/andreyka26-authorizations/blob/main/OAuthAndOpenIdConnect/OAuth.OpenIddict.WebClient/src/services/AuthService.js)**


```js
import { UserManager } from 'oidc-client-ts';
import { andreykaConfig } from '../utils/config';

const userManager = new UserManager(andreykaConfig.settings);

export async function getUser() {
    const user = await userManager.getUser();
    return user;
}

export async function isAuthenticated() {
    let token = await getAccessToken();

    return !!token;
}

export async function handleOAuthCallback(callbackUrl) {
    try {
        const user = await userManager.signinRedirectCallback(callbackUrl);
        return user;
    } catch(e) {
        alert(e);
        console.log(`error while handling oauth callback: ${e}`);
    }
}

export async function sendOAuthRequest() {
    return await userManager.signinRedirect();
}

// renews token using refresh token
export async function renewToken() {
    const user = await userManager.signinSilent();

    return user;
}

export async function getAccessToken() {
    const user = await getUser();
    return user?.access_token;
}

export async function logout() {
    await userManager.clearStaleState()
    await userManager.signoutRedirect();
}

// This function is used to access token claims
// `.profile` is available in Open Id Connect implementations
// in simple OAuth2 it is empty, because UserInfo endpoint does not exist
// export async function getRole() {
//     const user = await getUser();
//     return user?.profile?.role;
// }

// This function is used to change account similar way it is done in Google
// export async function selectOrganization() {
//     const args = {
//         prompt: "select_account"
//     }
//     await userManager.signinRedirect(args);
// }
```

This is the service for handling authentication and authorization in our React Client.

We will be using `UserManager` from `oid-client-ts` to provide our OAuth compliant authorization.

When our application is loaded the code below will be run once.


```js
const userManager = new UserManager(andreykaConfig.settings);
```

It will initialize `UserManager` with the configuration important from the previous section. Now we can use this `userManager` in our functions.

User manager will store all the data required for authentication and authorizations like `access_token`, `expires_at`, etc in [session storage](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage), by default, but this is configurable. 

[![alt_text](/assets/2024-01-02-oauth-authorization-code-react-client-pt1-openIddict/image5.png "image_tooltip")](/assets/2024-01-02-oauth-authorization-code-react-client-pt1-openIddict/image5.png "image_tooltip"){:target="_blank"}


If you close the page and reopen it - you will still be logged in until this session storage key-value pair exists.

This service has the following functions:



* `getUser()`- returns the authentication data from the storage (this data contains `access_token, expires_at, profile`)
* `getAccessToken()` - returns access_token prop from the getUser() object
* `isAuthenticated()` - checks whether token is not empty
* `handleOAuthCallback(callbackUrl)` - handles callback from Authorization Server with Authorization code and exchanges this code for access token. Besides that it sets all auth information to the storage.
* `sendOAuthRequest()` - starts Authorization Code flow.
* `renewToken()` - handles refresh token flow
* `logout()` - calls the logout endpoint on the Authorization Server side, and clears all authentication storage information about the user.

On top of that I have commented:



* `getRole()` - gets a role claim from a `profile` object inside the authentication information from storage. In our flow (OAuth) we will have the `profile` object empty, because it is populated for OpenId Connect flow only from user-info endpoint.
* `selectOrganization()` - does the same as `sendOAuthRequest()`, but with prompt=’select_account`. As mentioned in [OpenId Connect docs](https://openid.net/specs/openid-connect-basic-1_0.html#RequestParameters) - it allows you to implement account or tenant switching. But it does exist only in OIDC context, OAuth does not have this concept.


### **Update [App.js](https://github.com/andreyka26-git/andreyka26-authorizations/blob/main/OAuthAndOpenIdConnect/OAuth.OpenIddict.WebClient/src/App.js)**


```jsx
import { useEffect, useState } from 'react';
import { getUser, logout } from './services/AuthService'
import { BrowserRouter, Routes, Route } from "react-router-dom";
import UnAuthenticated from './pages/unauthenticated.page';
import ProtectedRoute from './components/ProtectedRoute';
import { getResources as getAndreykaResources } from './services/Api';
import OAuthCallback from './pages/oauth-callback.page';

function App() {
 const [isAuthenticated, setIsAuthenticated] = useState(false);
 const [user, setUser] = useState(null);
 const [resource, setResource] = useState(null)
 const [isLoading, setIsLoading] = useState(true);

 async function fetchData() {
   const user = await getUser();
   const accessToken = user?.access_token;

   setUser(user);

   if (accessToken) {
     setIsAuthenticated(true);

     const data = await getAndreykaResources(accessToken);
     setResource(data);
   }

   setIsLoading(false);
 }

 useEffect(() => {
   fetchData();
 }, [isAuthenticated]);

 if (isLoading) {
   return (<>Loading...</>)
 }

 return (
   <BrowserRouter>
     <Routes>
       <Route path={'/'} element={<UnAuthenticated authenticated={isAuthenticated} />} />

       <Route path={'/resources'} element={
         <ProtectedRoute authenticated={isAuthenticated} redirectPath='/'>
           <span>Authenticated OAuth Server result: {JSON.stringify(user)}</span>
           <br />
           <span>Resource got with access token: {resource}</span>

           <button onClick={logout}>Log out</button>
         </ProtectedRoute>
       } />

       <Route path='/oauth/callback' element={<OAuthCallback setIsAuthenticated={setIsAuthenticated} />} />
     </Routes>
   </BrowserRouter>
 );
}

export default App;
```

As a state of the App component we have:



* `isAuthenticated`, responsible for signaling whether the user is authenticated (whether to show him protected resource or not)
* `user`, in terms of `oidc-client-ts` is all the information library can get after authorization (completing OAuth flow), including access and id tokens, data from `user-info` endpoint. Since it is an OAuth flow we care only about access_token.
* `resource` is information we are getting from a protected endpoint using an access token.
* `isLoading` is an optional state needed to not show the content until requests to the server are done.

Then we have `fetchData`, this is the function that gets access_token from the session storage. With this token it tries to call Resource Server, and set the data to show on the page.

To populate the data when our app loads we use useEffect hook. It will be run during the first load of the page (which will set the state as unauthenticated), and then on each change of `isAuthenticated` dependency. 

The last part is our routes section. We have all our routes mentioned in `Application design`, and corresponding components that will handle them.

Among peculiarities here:



* We pass `setIsAuthenticated` to the `OAuthCallback` page to update `isAuthenticated` inside it and make `App.js` to rerender and show information based on newly updated authentication value. Otherwise if we use `navigate` from `react-router-dom` in `OAuthCallback` instead of raw browser redirect `window.location.href =` it will not trigger `useEffect` in `App.js`, which consequently will not update isAuthenticated and show us unauthenticated page. We have `isAuthenticated` in the dependency array of `useEffect` for exactly the same reason - to trigger it if it has been changed.
* We wrapped everything inside the `/resources` route into `ProtectedRoute` which will not allow children to render despite `isAuthenticated` being true.
* In the `/resources` endpoint we show everything that we have stored in client session storage including access_token, and the resource returned from Resource Server. As you remember from [this article](https://andreyka26.com/oauth-authorization-code-using-openiddict-and-dot-net) - we return one of the claims that we have in access_token.


### **Add [components/ProtectedRoute.js](https://github.com/andreyka26-git/andreyka26-authorizations/blob/main/OAuthAndOpenIdConnect/OAuth.OpenIddict.WebClient/src/components/ProtectedRoute.js)**


```jsx
import { Navigate } from "react-router-dom";

function ProtectedRoute({authenticated, children, redirectPath = '/'}) {
    if (!authenticated) {
        return <Navigate to={redirectPath} replace />;
    }

    return children;
};

export default ProtectedRoute;
```

The behavior of this component is very simple: if the user is not authenticated - it will redirect to the `redirectPath`. All the variables (`isAuthenticated` and `redirectPath` are set in the outer `App.js` as props)

Basically it will not allow to render children components if `authenticated` is not true.


### **Add [pages/oauth-callback.page.js](https://github.com/andreyka26-git/andreyka26-authorizations/blob/main/OAuthAndOpenIdConnect/OAuth.OpenIddict.WebClient/src/pages/oauth-callback.page.js)**


```jsx
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { handleOAuthCallback, isAuthenticated } from "../services/AuthService"

function OAuthCallback({setIsAuthenticated}) {
    // rerendering the components does not change isProcessed, but remounting the component does change.
    const isProcessed = useRef(false);
    const navigate = useNavigate();

    useEffect(() => {
        async function processOAuthResponse() {
            // this is needed, because React.StrictMode makes component to rerender
            // second time the auth code that is in req.url here is invalid,
            // so we want it to execute one time only.
            if (isProcessed.current) {
                return;
            }

            isProcessed.current = true;

            try {
                const currentUrl = window.location.href;
                await handleOAuthCallback(currentUrl);

                setIsAuthenticated(await isAuthenticated());
                navigate("/resources");
            } catch (error) {
                console.error("Error processing OAuth callback:", error);
            }
        }

        processOAuthResponse();
    }, [])
}

export default OAuthCallback;
```


When we are doing Authorization Code flow, as explained [here](https://andreyka26.com/auth-from-backend-perspective-pt3-oauth-basics#authorization-code), the Authorization Server redirects to the Client with authorization code added as query parameter, which the Client will exchange for access token. 
 
This page is used only to catch and handle redirects from Authorization Server, so it does not render anything (no JSX). We have a useEffect hook that will run `processOAuthResponse` on the page (which is component) load.

In `processOAuthResponse` we simply get the current url and consume it in `handleOAuthCallback` that will extract and exchange authorization code for access token.

After this we get newly updated `isAuthenticated` from the App.js, which should be true in case of successful auth code exchange and update `isAuthenticated` from `App.js` using a function from props.

It will trigger useEffect in `App.js`, and rerender authentication information we have in the storage and resource data got from Resource Server with access_token.

OAuthCallback also has an `isProcessed` useRef hook. It is needed, because in development mode, when Authorization Server redirects to the OAuthCallback page its [useEffect will be triggered twice due to React.StrictMode](https://react.dev/reference/react/StrictMode#fixing-bugs-found-by-double-rendering-in-development). In OAuth specification the Authorization Code [should be valid only once](https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.2), so if it is leaked - the malicious code cannot exchange it a second time and get a token. This way our Authorization Server will not provide us access token on second exchange try. In production it should not be like that, but I made it work in a development environment as well.


### **Add [pages/unauthenticated.page.js](https://github.com/andreyka26-git/andreyka26-authorizations/blob/main/OAuthAndOpenIdConnect/OAuth.OpenIddict.WebClient/src/pages/unauthenticated.page.js)**


```jsx
import { sendOAuthRequest } from '../services/AuthService';
import { Navigate } from "react-router-dom";

function UnAuthenticated({ authenticated }) {
  if (authenticated) {
    return <Navigate to='/resources' replace />;
  }

  return (
    <>
      <span>You are not authenticated - Log In first</span>
      <br />
      <button onClick={sendOAuthRequest}>Login via andreyka26</button>
    </>
  )
}

export default UnAuthenticated;
```

This page is very simple: in case the user is not authenticated - we render the button `Login via andreyka26`, otherwise we redirect to `/resources` since the user should have access to resources.


### **Add [services/Api.js](https://github.com/andreyka26-git/andreyka26-authorizations/blob/main/OAuthAndOpenIdConnect/OAuth.OpenIddict.WebClient/src/services/Api.js)**

```jsx
export async function getResources(token) {
  const url = 'https://localhost:7002/resources';

  const options = {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };

  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }

    const data = await response.text();
    return data;
  } catch (error) {
    console.error('There was an error fetching the data', error);
  }
}
```


Api service is our backend communication point. Here, it just sends a request to [Resource Server](https://github.com/andreyka26-git/andreyka26-authorizations/tree/main/OAuthAndOpenIdConnect/OAuth.OpenIddict.ResourceServer) with Bearer access_token that we got while authenticating. We don’t use anything fancy here - just the default fetch api that comes from the browser.


## **Demo**

Run postgres (it is needed for OpenIddict database), you could follow [this tutorial ](https://andreyka26.com/postgres-with-docker-local-development)about how to set postgres using docker.

Run [Authorization Server](https://github.com/andreyka26-git/andreyka26-authorizations/tree/main/OAuthAndOpenIdConnect/OAuth.OpenIddict.AuthorizationServer) and [Resource Server](https://github.com/andreyka26-git/andreyka26-authorizations/tree/main/OAuthAndOpenIdConnect/OAuth.OpenIddict.ResourceServer). They have [pre configured client configuration](https://github.com/andreyka26-git/andreyka26-authorizations/blob/5a0b1b5364fbf61b72edcca632d3a5d744e037a9/OAuthAndOpenIdConnect/OAuth.OpenIddict.AuthorizationServer/ClientsSeeder.cs#L93) seeding, so that our React Client is properly registered.

Run our client using `npm start`

Open it in a private window  (that does not have any session, cookies and storage data set yet): [http://localhost:3000](http://localhost:3000).

You will see unauthenticated page:


[![alt_text](/assets/2024-01-02-oauth-authorization-code-react-client-pt1-openIddict/image4.png "image_tooltip")](/assets/2024-01-02-oauth-authorization-code-react-client-pt1-openIddict/image4.png "image_tooltip"){:target="_blank"}


Click the button


[![alt_text](/assets/2024-01-02-oauth-authorization-code-react-client-pt1-openIddict/image1.png "image_tooltip")](/assets/2024-01-02-oauth-authorization-code-react-client-pt1-openIddict/image1.png "image_tooltip"){:target="_blank"}
 
 
Our Authorization Server (7000th port) does not find any cookies associated with the user - so it is not authenticated. Therefore it loads the authentication page. In the case of Google or Github Auth - their authentication pages would be loaded. 
 
Just click submit, the values are preconfigured and correct.


[![alt_text](/assets/2024-01-02-oauth-authorization-code-react-client-pt1-openIddict/image2.png "image_tooltip")](/assets/2024-01-02-oauth-authorization-code-react-client-pt1-openIddict/image2.png "image_tooltip"){:target="_blank"}
 
 
As a compliant OAuth implementation we require Resource Owner’s consent to proceed. Again from the authorize endpoint we detect that consent cookies do not exist and load the page to get the consent. 

Click Grant.


[![alt_text](/assets/2024-01-02-oauth-authorization-code-react-client-pt1-openIddict/image3.png "image_tooltip")](/assets/2024-01-02-oauth-authorization-code-react-client-pt1-openIddict/image3.png "image_tooltip"){:target="_blank"}
 
 
After we granted consent - the Authorization Server redirected us to the callback page, where we, using `oidc-client-ts` function exchanged auth code for access_token. Then we called resources endpoint from Resource Server using this token, and rendered an answer from it on our App.js.

## Security Consideration

Please note, when you implement OAuth Authorization Code flow on SPA client like React - you are exposing your client_id and client_secret to the user, since it is in your source code. The north star solution is to use PKCE.


## **Conclusion**

In this article - we have set up a simple React client that works with any compliant OAuth implementation: in our case our Authorization Server and Resource Server. Later on I will reuse this code to create the same for Github and you will see that it is enough to change the configuration and it will still perfectly work.

Kudos to my friend who helped me with writing React Client, reviewed my code and suggested tech improvements: [https://www.linkedin.com/in/svirgunvolodia/](https://www.linkedin.com/in/svirgunvolodia/)

 
On top of that - please check our startups if you are interested: [Symptom Diary](https://blog.symptom-diary.com/), [Pet4Pet](https://pet-4-pet.com/).

Please subscribe to my social media to not miss updates.: [Instagram](https://www.instagram.com/andreyka26_se), [Telegram](https://t.me/programming_space)

I’m talking about life as a Software Engineer at Microsoft.

<br>

Besides that, my projects:

Symptoms Diary: [https://blog.symptom-diary.com](https://blog.symptom-diary.com)

Pet4Pet: [https://pet-4-pet.com](https://pet-4-pet.com)