---
layout: post
title: "Url Shortener (Bitly) System Design with Microsoft Engineer"
date: 2025-10-15 10:23:23 -0000
category: System Design
tags: [system_design, architecture]
description: "Learn how to design a scalable, highly available URL shortener capable of handling billions of requests per day. Explore functional and non-functional requirements, Base62 encoding, Snowflake ID generation, sharding strategies, and system design best practices for high-load distributed systems."
thumbnail: /assets/2025-10-15-url-shortener-bitly-system-design-with-microsoft-engineer/logo.png
thumbnailwide: /assets/2025-10-15-url-shortener-bitly-system-design-with-microsoft-engineer/logo-wide.png
---

* TOC
{:toc}


<br>

## **Introduction**

URL shortener is one of the most classic and simplest system design problems, yet there are so many incorrect solutions on the internet that I can’t stay silent any longer. I’m a Software Engineer at Microsoft, working on high-load distributed systems that handle millions of requests per second - so today, we’re going to build a URL shortener together, properly.

PoC source code: [andreyka26-distributed-systems](https://github.com/andreyka26-git/andreyka26-distributed-systems/tree/main/UrlShortener)




<br>

## **1 Requirements**

Every system design discussion begins with clarifying the requirements. These may vary depending on the company and the interviewer, so I will present the most common ones.




<br>

### **Functional Requirements**

Functional requirements describe how the application works from the user’s or client’s perspective.



1. The system creates and returns a short URL given a long original URL
2. When a user accesses the short URL, the system redirects them to the long original URL
3. Follow-up: Analytics - each time the link is clicked, notify an external analytics service




<br>

### **Non Functional Requirements**

Non-functional requirements cover the technical aspects of the solution, including typical architectural concerns such as availability, consistency, scalability, and latency.



1. **Short URL Uniqueness - our CORE problem**: a Short URL must not point to more than one Long URL.
2. **Scalability / Traffic / Load**: ChatGPT reports that Bitly creates 10-30 million links per day. Let’s push that to the extreme - 300 million links per day. I would assume at least ten times more read traffic, since people mostly click on links rather than create them.
    1. Write traffic: **300M Daily** = **3.4k rps**.
    2. Read traffic: **3B Daily** = **34k rps**.
    3. Memory: 2 trillion URLs - 20 years of operation with 300M new URLs daily.
3. **CAP (Availability vs Consistency)** - We will prioritize high availability, which means adopting **eventual consistency**. We understand that it may take some time before links are available everywhere for redirection.
4. **Traffic type: spiky**. We clearly face a “celebrity problem” - there is a huge difference between me and Trump posting a link on social media.




<br>

### **Short URL Uniqueness - our CORE requirement**

Every system design has some “special” core requirement or problem to solve, all other requirements can be trivially solved using well-known patterns.

In our case the problem is that we cannot allow one Short URL to point to two different Long URLs.




<br>

#### **URL Length**

We agreed earlier that we want the URLs to be as short as possible, but clearly there is a tradeoff: the shorter the URL, the fewer combinations we can make.

We have **62 characters** for URL symbols: 26 lowercase + 26 uppercase letters + 10 digits. We cannot include special characters because they can be misinterpreted by browsers, e.g. `?` and `&`

Consider an url with a single character available. In that case we would have only 62 possibilities. After generating 62^1 unique URLs, any next character we choose will produce a URL we've already generated. If we want more, we need to add one more character, and then we would have 62^2 = 3844 possibilities.

To operate for 20 years given 300M new URLs daily, we need 300M * 365 * 20 = 2 190 000 000 000 (2 trillion) URLs.

With simple math, 7 characters are enough to satisfy our requirements for the next 20 years:

`62^7 = 3 521 614 606 208 (3 trillions) > 2 190 000 000 000 (2 trillions)`

Now, the most interesting question: HOW can we generate these 7-character valuesso they are unique?




<br>

#### **Direct Long URL usage**

```cs
var urlBytes = Encoding.UTF8.GetBytes(originalUrl);
var shortUrl = Base62Utils.ToBase62(urlBytes);
```

We’ll have a few problems with this approach: the original URL might be longer than 7 characters; trimming it leads to collisions, and users cannot create different short URLs pointing to the same long URL. 

Conclusion: a bad option.




<br>

#### **Random generation**

```cs
var chars = new char[7];
for (int i = 0; i < 7; i++)
{
    chars[i] = Base62Characters[_random.Next(Base62Characters.Length)];
}
return new string(chars);
```

It would be ideal, since we can directly create base62 strings without transformations, but again - collisions. Of course we can retry, but how many times? What if all 3-5 retries led to collisions? Should we fail the request and ask users to try again? 

Conclusion: not the best option.




<br>

#### **Long URL Hashing**

```cs
using var sha256 = SHA256.Create();
var hashBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(originalUrl));
var shortUrl = Base62Utils.ToBase62(hashBytes);
```

Hashing can naturally produce collisions, just like the Random generation approach, apart from the fact that hashing is more CPU intensive, and requires an additional transformation to base62.

Conclusion: a bad option.




<br>

#### **GUID generation**

```cs
var guidBytes = guid.ToByteArray();
var shortUrl = Base62Utils.ToBase62(guidBytes);
```

GUIDs are naturally unique and might seem like a good option, however they are still too long (22 base62 characters). Trimming them will lead to collisions.




<br>

#### **Unique Number**

```cs
var id = await _uniqueIdClient.GetUniqueIdAsync();
var scrambledId = ScrambleId(id);
var shortUrl = Base62Utils.ToBase62(scrambledId).PadLeft(7, '0');
```

The north-star solution here is to use a unique number generator and convert the number to base62. Since the maximum number of unique Short URLs we can create is 4 trillion - we need a 42-bits number.

62 ^ 7 = 3 521 614 606 208

2 ^ 42 = 4 398 046 511 104

Note: `ScrambleId` is needed for numbers like “1”, “2”, which would otherwise give us “0000001” and “0000002” short URLs

While the number is unique, the Short URL is unique as well.




<br>

### **API Design**

We’ll need 2 endpoints:

`POST /shorturl {‘longUrl’: <lurl>}` will generate a Short URL `<surl>`, store it as mapping `<surl>: <lurl>` and return it to the caller.

`GET /<surl>` - will resolve `<lurl>` from the storage, and return 301 Redirect to `<lurl>`




<br>

## **2 Satisfy Functional requirements**


[![alt_text](/assets/2025-10-15-url-shortener-bitly-system-design-with-microsoft-engineer/image1.png "image_tooltip")](/assets/2025-10-15-url-shortener-bitly-system-design-with-microsoft-engineer/image1.png "image_tooltip"){:target="_blank"}


As our first step we should satisfy functional requirements **without thinking about scaling, availability, high load**, etc. Just something that works for a couple of users.

We can create an API with the two endpoints described above. Use SQL database with a primary auto-increment ID table for unique number generation. Add main storage for `Short URL -> Long URL` mapping, with indices for faster lookup.

The POST endpoint will get the next unique number, generate a Short URL and insert the mapping into main storage.

The GET endpoint will look up the long URL in the storage given the short URL and return a 301 Redirect. 





<br>

## **3 Satisfy Non-Functional Requirements**


[![alt_text](/assets/2025-10-15-url-shortener-bitly-system-design-with-microsoft-engineer/image2.png "image_tooltip")](/assets/2025-10-15-url-shortener-bitly-system-design-with-microsoft-engineer/image2.png "image_tooltip"){:target="_blank"}





<br>

### **High Scalability**




<br>

#### **API scaling**

API scaling is trivially solved by replicating the API across multiple instances with several LBs to distribute the load, since the API is stateless.




<br>

#### **URLs storage scaling**

Our mapping record `shourtUrl -> longUrl` will take around 200-250 bytes. Overall we will need 250 * 2 trillion records = 500 Terabytes.

URLs storage is **load-intensive** rather than memory-intensive, and from a load perspective we definitely have many more reads than writes `reads >> writes`.

For read scaling, we can put a few in-memory cache replicas (e.g. Redis) near the main storage shard + possibly leader-follower replicas (see availability section).

We also need to scale writes, as 3-4k rps is a bit too much for a single node. In this case, the solution is straightforward - apply sharding using “short URL” as sharding key. For easy rebalancing use either consistent or rendezvous hashing, or hash-slots sharding (the one Redis uses). This will split our writes evenly between shard nodes.

To decrease latency, we can additionally put a sharded LRU Distributed Cache in all Regions (DCs), and configure LBs to direct the users to the closest node.




<br>

#### **Unique Number Storage scaling**

This is one of the most poorly solved problems in publicly available solutions. Remember, our initial solution was just to keep a SQL db with a single table and a single Primary AUTO INCREMENT Id.

What is the problem here? First of all, it is a single point of failure, and it is not easy to solve with replication (see availability section). Second, 3.5k writes per second is doable for an ideally optimised and scalable Postgres instance, but I want to have the ability to scale to even more writes.

The distributed unique number generator is definitely a separate system design, but let’s broadly consider the options here.

Some bad options:



* **create a static number of shards**, and make them handle `id % N` numbers, e.g. shard1 handles all even numbers and shard2 handles all odd numbers. It is better than a single instance, but it is not flexible - there is no way to downscale or upscale without losing either the uniqueness property or the number space.
* **assign each shard a range**, e.g. shard1 handles numbers from 0 to 1000, shard2  - from 1001 to 2000, and so on.  This solution has poor maintainability: when range is exhausted, it is hard to assign a new one. Besides that, it is impossible to add new nodes without knowing the state of other nodes. Not even mentioning that not every database can start Primary Id from a predefined offset.

I see here only 2 good solutions.




<br>

##### **Prefixed shards**


[![alt_text](/assets/2025-10-15-url-shortener-bitly-system-design-with-microsoft-engineer/image4.png "image_tooltip")](/assets/2025-10-15-url-shortener-bitly-system-design-with-microsoft-engineer/image4.png "image_tooltip"){:target="_blank"}


We reserve a couple of bits of the number for shard id. Let’s say we know we will have no more than 16 shards - then we reserve the first 4 bits of the unique id. 

Now, each shard deals with exactly the same sequence of PRIMARY AUTOINCREMENT IDs (from 0 to 2^64). Every single shard appends its shard id (unique per shard) at the beginning. It can be done on the database level or the API level.

We just need to make sure that no two shards have the same ID (via config, or by embedding it in a table in the shard itself).

This solution easily allows adding new shards without knowing the state of other shards. However, downscaling would be a bit challenging.




<br>

##### **[Snowflake Id](https://en.wikipedia.org/wiki/Snowflake_ID)**


[![alt_text](/assets/2025-10-15-url-shortener-bitly-system-design-with-microsoft-engineer/image3.png "image_tooltip")](/assets/2025-10-15-url-shortener-bitly-system-design-with-microsoft-engineer/image3.png "image_tooltip"){:target="_blank"}


This is the [north-star solution](https://en.wikipedia.org/wiki/Snowflake_ID), because it is fully stateless, meaning it does NOT require any storage whatsoever. It is easy to upscale and downscale, and it is faster than other options.

The idea is the same as in early versions of GUID. We use 64 bits for numbers.

41 bits - timestamp

10 bits - machine id

12 bits - sequence number

Whenever some API receives a request to give the unique number, it takes the current UTC time (milliseconds precision), appends its machine id (which should be unique across all nodes) and appends the Sequence Number.

The sequence number is 1 by default. It is only required in the cases, when the same API receives 2 or more requests at the same millisecond, so each request will get a different sequence id.

There is only one drawback in this solution. Since our number is at max 2 ^ 64, we cannot fit it into a 62 ^ 7 Short URL value, and in this case we would need to use 11 characters instead of 7.

```
62 ^ 7   =                     3 521 614 606 208

2 ^ 64   = 18 446 744 073 709 600 000

62 ^ 11 = 52 036 560 683 837 100 000
```

Actually we don’t need all 64 bits, 42 bits would be perfectly fine for 2 trillion URLs 
62 ^ 7 = 3 521 614 606 208

2 ^ 42 = 4 398 046 511 104

Unfortunately, we cannot shrink it to 42 bits, as it is not enough for Snowflake ids. The maximum we can shrink to is 55 bits => 10 characters:



* 39 bits for milliseconds, which will give us 17 years of service
* 6 bits for machineid (64)
* 10 bits for SN (1024)




<br>

### **High availability**

High availability is usually achieved through replication.




<br>

#### **API availability**

It’s trivial: just add additional API instances, so that if some APIs fail, the load balancer will direct traffic to the ones that are alive




<br>

#### **URLs storage availability**

If we can accept rare data loss (e.g., during leader election), we can use leader-follower asynchronous replication. When data loss is not acceptable, there is nothing else except Raft-based replication, where we can afford to lose a minority of nodes, or cannot use replication at all.




<br>

#### **Unique Number Storage availability**

For Prefixed shards solution, we cannot afford data loss here - so we definitely cannot use Leader-Follower async replication. Moreover, synchronous Leader-Follower replication does not fit our needs either, as we would not be resilient against replica loss.

This is the rare case, when we can use shards as availability guarantees: if shard1 dies, the API can round-robin to shard2, which is alive.

In the case of the Snowflake Id solution, due to its stateless nature, high availability is trivially solved with replication as explained in the API availability section.




<br>

## **Conclusion**

You might notice that we didn’t cover the follow-up with analytics, as this is something you can suggest in the comments section!

I would appreciate your feedback on this system design solution. Please share your thoughts and subscribe on Instagram and Telegram to be part of the FAANG SWE community.

