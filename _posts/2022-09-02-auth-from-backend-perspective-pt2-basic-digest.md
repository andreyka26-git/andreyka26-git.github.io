---
layout: post
title: "Auth from backend perspective pt2: Basic and Digest Schemes"
date: 2022-09-02 11:02:35 -0000
category: ["Auth from backend perspective"]
tags: [guides, authorization, dotnet, tutorials]
description: "In this article we will implement basic auth schemes: Basic Authorization and Digest Authorization using .NET and C#. On top of that I'll explain how and why they work, and I will cover pros and cons of them"
---

* TOC
{:toc}

<!-- Output copied to clipboard! -->

<!-----

You have some errors, warnings, or alerts. If you are using reckless mode, turn it off to see inline alerts.
* ERRORs: 0
* WARNINGs: 0
* ALERTS: 6

Conversion time: 2.452 seconds.


Using this Markdown file:

1. Paste this output into your source file.
2. See the notes and action items below regarding this conversion run.
3. Check the rendered output (headings, lists, code blocks, tables) for proper
   formatting and use a linkchecker before you publish this page.

Conversion notes:

* Docs to Markdown version 1.0β33
* Fri Sep 02 2022 05:34:03 GMT-0700 (PDT)
* Source doc: Authorization & Authentication from backend perspective pt1
* This document has /assets/2022-09-02-auth-from-backend-perspective-pt2-basic-digest: check for >>>>>  gd2md-html alert:  inline image link in generated source and store /assets/2022-09-02-auth-from-backend-perspective-pt2-basic-digest to your server. NOTE: /assets/2022-09-02-auth-from-backend-perspective-pt2-basic-digest in exported zip file from Google Docs may not appear in  the same order as they do in your doc. Please check the /assets/2022-09-02-auth-from-backend-perspective-pt2-basic-digest!

----->

## **Why you may want to read this article**

In the [previous article](https://andreyka26.com/auth-from-backend-percpective-pt1-basics) about basics, we considered some auth terminology, and explored all diversity of existing authentication and authorization protocols and schemes.

In this part, I’ll explain and implement `Basic` and `Digest` Auth schemes.

<br>

## **Basic Scheme**

[RFC reference](https://www.rfc-editor.org/rfc/rfc7617.html)

[Wikipedia reference](https://en.wikipedia.org/wiki/Basic_access_authentication)

It is the simplest auth scheme:

1. get username and password
2. concatenate them with “:”
3. encode with Base64
4. send a request with an Authorization header
5. The `Server` validates username and password internally

Using this scheme we cannot decouple `Auth` from the `Resource server`. So for each request, the `Server` should get all info from the Authorization header, authenticate the `User` and then authorize him as well. It means that `API` should know who the `User` is (store him or know where to get it). To be able to decouple we will consider JWT tokens later on.

Note: encoding to base64 is needed for encoding special characters, to ensure the string contains only ASCII characters it `will not` give you any security layer. \
Since the user passes his credentials in a raw state - it is required to use one more security layer on top of the HTTP application layer - TLS.

[Basic Auth Server in Github](https://github.com/andreyka26-git/dot-net-samples/tree/main/AuthorizationSample/SimpleAuth/Basic.Custom.Server)

[Basic Auth Client in Github](https://github.com/andreyka26-git/dot-net-samples/tree/main/AuthorizationSample/SimpleAuth/Basic.Custom.WebClient)

[![alt_text](/assets/2022-09-02-auth-from-backend-perspective-pt2-basic-digest/image1.png "image_tooltip")](/assets/2022-09-02-auth-from-backend-perspective-pt2-basic-digest/image1.png "image_tooltip")

`HandleAuthenticateAsync` first does the authentication: it extracts username and password from the header (decoding base64) and ensures this user does exist (in our case it is a simple if statement, but in the real case, it should hash the pass and check it along with username). It does it for every request because we used `.UseAuthorization() .UseAuthentication()` middleware registration methods.

But this is the `Authentication` part of it, we only checked that the user is who he claims to be.

After `HandleAuthenticateAsync` did the authentication part we will have `User.Identity` in each endpoint, and based on this identity we can do `Authorization` - to verify whether this particular user is allowed to access this endpoint or not.

[![alt_text](/assets/2022-09-02-auth-from-backend-perspective-pt2-basic-digest/image3.png "image_tooltip")](/assets/2022-09-02-auth-from-backend-perspective-pt2-basic-digest/image3.png "image_tooltip")

However, `Basic Auth` is so simple it brings a few problems:

- It is not secured, you need to send your unencrypted unhashed password through the network
- It doesn’t have any defined way of logging out and logging in the user.
- No built-in protocol for giving different permissions for different endpoints, roles, etc. Meaning, that `Resource Server` will not have claims (role, static, etc) that it can validate in the token. This forces each `Resource Server` to know all user permissions and store them inside.
- The `API` should know the user (store it)

<br>

## **Digest Scheme**

[RFC reference](https://datatracker.ietf.org/doc/html/rfc7616)

[Wikipedia reference](https://en.wikipedia.org/wiki/Digest_access_authentication)

First of all, I should mention that this sample I rewritten from this repo, so you can see the [original version](https://github.com/flakey-bit/DotNetDigestAuth)

[Digest Auth Server in Github](https://github.com/andreyka26-git/dot-net-samples/tree/main/AuthorizationSample/SimpleAuth/Digest.Custom.Server)

[Digest Auth Client in Github](https://github.com/andreyka26-git/dot-net-samples/tree/main/AuthorizationSample/SimpleAuth/Digest.Custom.WebClient)

It is a little bit complicated `auth` flow compared to `Basic Auth`. It doesn’t pass a password through the network, instead of this we are creating and storing some hashes.

Using this scheme we cannot decouple `Auth` from `Resource server`. So for each request, the `Server` should get all info from the Authorization header, authenticate the `User` and then authorize him as well. It means that `API` should know who the `User` is (store him or know where to get it). To be able to decouple we will consider JWT tokens later on.

This flow requires you to call the endpoint 2 times if you are not authenticated. First, you should receive 401 with the necessary headers and the next call is done with a generated digest token (on `Client` side) based on those headers.

Prior to explaining the flow, we should introduce some terminology:

- `Username` - just login provided by the user
- `Password` - just the password provided by the user
- `Realm` - area which you can access with a particular digest ticket, something similar to scope in `OAuth`. You might return the same `realm` value for some particular set of endpoints and you will have access to those endpoints with the same `auth` ticket.
- `Nonce (number once)` - `Server`-generated string which should be unique for all 401 responses.
- `CNonce (client nonce)` - `Client`-generated string which should be sent and verified by the `Client`. `The Server` doesn’t care about it and includes it as a response so that the `Client` can confirm that it is the right `Server`. It is used for plain-text attack mitigation (when an attacker has a plaintext and encrypted version, based on that he could reveal secrets, code blocks, etc).
- `Nc (nonce count)` - the number of requests (including the current one) that the `Client` has sent with the `nonce` value in it.
- `Opaque` - `Server` -generated string which should be sent unchanged by the `Client`.
- `Qop (quality of protection)` - defines whether the hash of entity-body is added to hashes or not. It brings additional integrity. It might contain either “`auth`” or “`auth-int`” values.
- `Response` - in terms of `Digest auth` it is a kind of signature, just a hash, based on values that will be sent to the `Server` to be verified.

For this auth, we may use different hash algorithms, but for simplicity, we will use MD5.

The flow is the following:

1.`The Client` performs a request to `Resource Server` without any `Auth`.

2.`The Client` collects `realm`, `qop`, `nonce`, and `opaque` from the response header.

[![alt_text](/assets/2022-09-02-auth-from-backend-perspective-pt2-basic-digest/image5.png "image_tooltip")](/assets/2022-09-02-auth-from-backend-perspective-pt2-basic-digest/image5.png "image_tooltip")

3.The `Client` generates a request auth token:

_**First Hash (A1)** = MD5 (`username`:`realm`:`password`)_

Note: we can use the MD5-sess algorithm, which essentially means to use the same algorithm, but in this format:

_**First Hash (A1)** = MD5 (MD5 (`username`:`realm`:`password`):`nonce`:`cnonce`)_

Why would we like to do it? It allows you to not care about the user’s password. On top of that, I think, it allows you to use a different algorithm for hashing user credentials (username:realm:password) for security purposes. And for `auth` we can use another algorithm with `nonce` and `cnonce` values.

_**Second Hash (A2)** = MD5 (httpMethod:requestUrl)_

_**Response** = MD5 ({**First Hash**}:`nonce`:`nonceCount`:`cnonce`:`qop`:{**Second Hash**})_

[![alt_text](/assets/2022-09-02-auth-from-backend-perspective-pt2-basic-digest/image6.png "image_tooltip")](/assets/2022-09-02-auth-from-backend-perspective-pt2-basic-digest/image6.png "image_tooltip")

4.The `Client` sends the same request including the Authorization header in the following format: Digest `username`=”{username}”,

`realm`=”{realm }”,

`nonce`=”{nonce}”,

`uri`=”{uri}”,

`qop`={qop},

`nc`={nc},

`cnonce`=”{cnonce}”,

`response`=”{response}”,

`opaque`=”{opaque}”

[![alt_text](/assets/2022-09-02-auth-from-backend-perspective-pt2-basic-digest/image4.png "image_tooltip")](/assets/2022-09-02-auth-from-backend-perspective-pt2-basic-digest/image4.png "image_tooltip")

5.The `Server` verifies the hash by using values provided by the `Client` (authenticate and authorize). Then it either rejects with a 4XX error or serves the response.

[![alt_text](/assets/2022-09-02-auth-from-backend-perspective-pt2-basic-digest/image2.png "image_tooltip")](/assets/2022-09-02-auth-from-backend-perspective-pt2-basic-digest/image2.png "image_tooltip")

There is one interesting question: How is the `Server` supposed to generate the first hash without knowing the password since the `Client` doesn’t pass it on request?

And there are 2 main solutions:

- we either store plain passwords (VERY VERY BAD APPROACH),
- or we store the hashed value of (`username`:`realm`:`password`) to be able to get the hash by `username` and `realm`. And this brings another problem. Once you realize you want to change a hash (for example you used firstly MD5 and then some security weaknesses were detected and you want to change to SHA-256) you cannot do much. But actually, this problem arises always when we are dealing with password storing and comparing.

Compared to `Basic Auth` this flow fixed a lot of problems:

- There is no plain password passed through the network
- You can configure nonce lifetime to allow access only for a certain period of time. It is possible to log out all users by changing `opaque` values, this will force everybody to re-authenticate.
- You can specify different access areas (different controllers, endpoints, etc) via `realm`.

However, it still has some problems:

- No built-in protocol for giving different permissions for different endpoints, roles, etc. Meaning, that `Resource Server` will not have claims (role, static, etc) that it can validate in the token. This forces each `Resource Server `to know all user permissions and store them inside.
- The `API `should know the user (store it). You can fix it by storing a hash for a particular username and realm, but still, it is some kind of knowledge of the user compared to JWT for example.

<br>

## **Conclusion**

`Basic Auth` is pretty simple to implement but it has a lot of functionality and security lacks. `Digest Auth` is much more complicated but solves some of the problems that `Basic Auth` has, but still, it has some lack of functionality that regular applications would need for the Auth process.

So in the next part, we will consider `OAuth` and `OpenId Connect` protocols that solved those problems.
