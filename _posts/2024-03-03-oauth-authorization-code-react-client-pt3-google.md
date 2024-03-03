---
layout: post
title: "OAuth Authorization Code React client pt3: Google"
date: 2024-03-03 11:02:35 -0000
category: ["Authorization guides"]
tags: [authorization, react-client, react, oauth, github]
description: "In this article we are going to create React client for Google OAuth Server. With this React client that runs in browser you will be able to authenticate authorize with Google and call Google API with obtained access token"
thumbnail: /assets/2024-03-03-oauth-authorization-code-react-client-pt3-google/logo.png
thumbnailwide: /assets/2024-03-03-oauth-authorization-code-react-client-pt3-google/logo-wide.png
---

<br>

* TOC
{:toc}

<!-- Copy and paste the converted output. -->

<!-----

You have some errors, warnings, or alerts. If you are using reckless mode, turn it off to see inline alerts.
* ERRORs: 0
* WARNINGs: 0
* ALERTS: 5

Conversion time: 1.77 seconds.


Using this Markdown file:

1. Paste this output into your source file.
2. See the notes and action items below regarding this conversion run.
3. Check the rendered output (headings, lists, code blocks, tables) for proper
   formatting and use a linkchecker before you publish this page.

Conversion notes:

* Docs to Markdown version 1.0β35
* Sun Mar 03 2024 15:14:45 GMT-0800 (PST)
* Source doc: OAuth Authorization Code React client pt3: Google
* This document has images: check for >>>>>  gd2md-html alert:  inline image link in generated source and store images to your server. NOTE: Images in exported zip file from Google Docs may not appear in  the same order as they do in your doc. Please check the images!

----->

## **Why you may want to read this article**

In the [last article](https://andreyka26.com/oauth-authorization-code-react-client-pt2-github) we have integrated our React SPA (single page application) with Github OAuth protocol. 
 
Today we will implement Google OAuth client using pure React Client without any additional backend. This is exactly this "Sign in with Google" button which we will implement here.
This Google authorization/authentication is also needed for [Google API](https://console.cloud.google.com/apis/library) integration, so you might use obtained token to integrate with any Google API: Calendar, Drive, etc.

<br />

## **Implementation**

We have already implemented the core of our React OAuth client in the [first article](https://andreyka26.com/oauth-authorization-code-react-client-pt1-openIddict). We will use [Core repository](https://github.com/andreyka26-git/andreyka26-authorizations/tree/main/OAuthAndOpenIdConnect/OAuth.OpenIddict.WebClient) and change some configuration to make it work with Google.

The whole source code for current project can be found [here](https://github.com/andreyka26-git/andreyka26-authorizations/tree/main/OAuthAndOpenIdConnect/OAuth.Google.WebClient)

<br />

### **Update [utils/config.js](https://github.com/andreyka26-git/andreyka26-authorizations/blob/main/OAuthAndOpenIdConnect/OAuth.Google.WebClient/src/utils/config.js)**

```jsx
const googleSettings = {
    authority: 'https://accounts.google.com/',
    client_id: 'CLIENT_ID',
    client_secret: 'CLIENT_SECRET',
    redirect_uri: 'http://localhost:3000/oauth/callback',
    silent_redirect_uri: 'http://localhost:3000/oauth/callback',
    post_logout_redirect_uri: 'http://localhost:3000/',
    response_type: 'code'
};

export const googleConfig = {
    settings: googleSettings,
    flow: 'google'
};

```

`authority` - we put a Google Authorization server domain. By this domain we will access Discovery Endpoint. This way we don’t need to override metadata in our configuration as we did in Github integration.

`client_id` - see `How to obtain Google OAuth credentials`

`client_secret` - see `How to obtain Google OAuth credentials`

`response_type` - we specify that the OAuth protocol should be an Authorization Code.

<br />

### **Update [services/AuthService.js](https://github.com/andreyka26-git/andreyka26-authorizations/blob/main/OAuthAndOpenIdConnect/OAuth.Google.WebClient/src/services/AuthService.js)**

```jsx
import { googleConfig } from '../utils/config'; 

const userManager = new UserManager(googleConfig.settings);

export async function logout() {
    await userManager.clearStaleState();

    try {
        await userManager.signoutRedirect();
    } catch (e) {
        console.log('error on signoutRedirect', e);
        window.location.href = '/';
    }
}
```

Here we changed config names, and logout function. Logout needed to be changed because Google didn’t provide `end_session_endpoint` in discovery endpoint response. 

`signoutRedirect` would fail since UserManager does not have end_session_endpoint.

So we cannot log out user on the Google side, but still we will drop all local state about authentication by calling `await userManager.clearStaleState();`


<br />

### **Update [services/Api.js](https://github.com/andreyka26-git/andreyka26-authorizations/blob/main/OAuthAndOpenIdConnect/OAuth.Google.WebClient/src/services/Api.js)**

```jsx
const url = 'https://www.googleapis.com/oauth2/v3/userinfo';
```

All parts remain the same, we only change url from our local Resource Server to Google API to demonstrate our token work with Google API properly.


<br />

### **Update [pages/unauthenticated.page.js](https://github.com/andreyka26-git/andreyka26-authorizations/blob/main/OAuthAndOpenIdConnect/OAuth.Google.WebClient/src/pages/unauthenticated.page.js)**

```jsx
<button onClick={sendOAuthRequest}>Login via Google</button>
```

 
We just change button name


<br />

## **How to obtain Google OAuth credentials**


<br />

### **Create Google Cloud Project**

Go to [this url](https://console.cloud.google.com/projectcreate)


[![alt_text](/assets/2024-03-03-oauth-authorization-code-react-client-pt3-google/image2.png "image_tooltip")](/assets/2024-03-03-oauth-authorization-code-react-client-pt3-google/image2.png "image_tooltip"){:target="_blank"}
 
Follow instructions until you create your project.


<br />

### **Create Consent Screen**

Select your project and go to `APIs & Services -> Credentials`


[![alt_text](/assets/2024-03-03-oauth-authorization-code-react-client-pt3-google/image1.png "image_tooltip")](/assets/2024-03-03-oauth-authorization-code-react-client-pt3-google/image1.png "image_tooltip"){:target="_blank"}


Click `Create Credentials -> OAuth client ID` 

[![alt_text](/assets/2024-03-03-oauth-authorization-code-react-client-pt3-google/image3.png "image_tooltip")](/assets/2024-03-03-oauth-authorization-code-react-client-pt3-google/image3.png "image_tooltip"){:target="_blank"}
 
 

If you don’t have Consent Screen - you would need to create it first. 


Select `User Type` to be `external`, any app name, your personal email as support email and developer email. Then click `Create`. 
 
Next screen is for scopes configuration. You might  add one if you need to access any Google services with the access token that we will obtain. 
 
Click the “Public app” button to make your consent screen available.

<br />

### **Obtain credentials (Client Id, Client Secret)**

Click `Create credentials -> OAuth client ID` again. Set the application type to `Web Application`. 
 
Set `Authorized Javascript Origins` to [http://localhost:3000](http://localhost:3000).  
 
Set `Authorized redirect URIs` to [http://localhost:3000/oauth/callback](http://localhost:3000/oauth/callback). Click Create. 
 
Copy Client Id and Client Secret for the use in our React OAuth Client. 
 
 

<br />

## **Google Auth Problems**


<br />

### **Google does not have end_session_endpoint**

I searched tons of forums, stackoverflow, github, official doc, asked GPT, Copilot - but I didin’t find end_session_endpoint.

According to [OpenId Connect official documentation](https://openid.net/specs/openid-connect-session-1_0-17.html#OPMetadata):

 
```
end_session_endpoint

REQUIRED. URL at the OP to which an RP can perform a redirect to request that the End-User be logged out at the OP.
```

The Discovery endpoint really does not have it: 

[![alt_text](/assets/2024-03-03-oauth-authorization-code-react-client-pt3-google/image4.png "image_tooltip")](/assets/2024-03-03-oauth-authorization-code-react-client-pt3-google/image4.png "image_tooltip"){:target="_blank"}



<br />

## **Demo**

Put Client Id and Client Secret to the configuration.

Run `npm start` to start the application.

Click `Login via Google` 
 

[![alt_text](/assets/2024-03-03-oauth-authorization-code-react-client-pt3-google/image5.png "image_tooltip")](/assets/2024-03-03-oauth-authorization-code-react-client-pt3-google/image5.png "image_tooltip"){:target="_blank"}
 

As you can see we have obtained the token and showed it on the page. On top of that you might see our call to userinfo endpoint with a token and its response that contains the “sub” field and “picture” field. 
 
You might try to access this endpoint with invalid token that will result in error, so 200 OK shows that we did everything correctly and our token is the correct one.

<br />

## **Conclusion**

Our core implementation proved itself once more with Google OAuth. It turned out that Google has much less problems and OAuth/OIDC incompatibilities compared to Github. Here we proved that our client is very flexible and we can make it work with any OAuth/Identity provider including Google Open Id Connect/OAuth2.

My Projects:

Symptom Diary: [https://blog.symptom-diary.com/](https://blog.symptom-diary.com/)

Pet4Pet: [https://pet-4-pet.com/](https://pet-4-pet.com/)