---
layout: post
title: "Ticketmaster System Design with Microsoft Engineer"
date: 2026-02-07 17:39:35 -0000
category: System Design
tags: [system_design, architecture]
description: "Learn how to design Ticketmaster system to handle millions of users, prevent double booking, and manage celebrity event spikes with 100-300k requests per second. Complete guide covering distributed locks, sharding, consistency, and scalability for FAANG interviews."
thumbnail: /assets/2026-02-08-ticketmaster-system-design-with-microsoft-engineer/logo.png
thumbnailwide: /assets/2026-02-08-ticketmaster-system-design-with-microsoft-engineer/logo-wide.png
---

* TOC
{:toc}



<br>

## **What this article is about**

This is a continuation of the System Design series, where I do very detailed solutions for the most popular problems that are asked in FAANG companies.
[Previous system design](https://andreyka26.com/payment-gateway-stripe-system-design-with-microsoft-engineer) was about designing Stripe - payment processing platform for businesses.

Today we are designing [Ticketmaster](https://www.ticketmaster.com/), one of the hardest system design problems for many reasons. It starts with popular events (celebrity problem), where you need to handle millions of requests per event, and ends with correctness of payments and ticket assignments.




<br>

## **Requirements**

We are following the same structure for each system design:



* Define functional and non-functional requirements
* Satisfy functional requirements for a few users and a single server
* Satisfy non-functional requirements
* Follow ups & infra cost if needed/asked




<br>

### **Functional Requirements**

If you think through how Ticketmaster works, it has simple requirements:



* create event
* search for an event
* book a ticket / seat
* avoid double booking (2 persons had the same ticket/seat)

To simplify, our domain will consist of events like concerts, standups etc, and we will work with specific seats instead of "areas" (for example, golden circle, fan zone, etc). Why? Because this is harder to handle, and the zone handling can be derived from handling specific seats easily.

To avoid confusion, we treat "ticket" and "seat" as the same concepts here - something that users can buy and should exclusively own until the event is over.




<br>

### **Non-Functional Requirements**

Typically interviewers make requirements in the way that a single machine cannot handle it, thus making you think about scalability, consistency and availability with all the tradeoffs between them.

For Ticketmaster we have:



* High load: 
    * 30-50M MAU (monthly active users) on average according to [official statistics](https://business.ticketmaster.com/ticketing-straight-to-your-app/?utm_source=chatgpt.com)
    * 7-10M DAU (Daily active users) - typically you can take 10-20% of MAU
* Availability: of course, we want it as high as possible, depending on consistency requirements.
* Consistency:
    * Strong consistency for booking the ticket to prevent double booking
    * Eventual consistency for everything else: searching events, creating events, analytics
* Spikes: 3.5B total requests for popular events => 100-300k rps (Taylor Swift).




<br>

## **Satisfy Functional Requirements**

Now, we focus on a single machine with a few users just to show that the system overall works.




<br>

### **Create Event**

Imagine I'm Lady Gaga, or her manager, and I want to create an event in some city.


[![alt_text](/assets/2026-02-08-ticketmaster-system-design-with-microsoft-engineer/image3.png "image_tooltip")](/assets/2026-02-08-ticketmaster-system-design-with-microsoft-engineer/image3.png "image_tooltip"){:target="_blank"}


Let's keep things simple. We define a simple RESTful stateless service and some storage (postgres for example).

The manager has a UI where he can input the event information and tickets information, e.g. how many tickets/seats, the price for each one.




<br>

### **Search for an event**

For searching we don't need to add anything else, just a GET endpoint that accepts a bunch of query parameters and applies them as "WHERE" clauses in the database.




<br>

### **Book a ticket / seat**

Let's draw the user experience for this feature:



* User looks for an event via search
* User clicks on it and goes to the "Arena" page, where they can select a suitable seat
* Then the user is redirected to the "payment" page, where payment is secured

We will use a third party payment processor, for example Stripe that we have already designed (we will be the merchant).

To achieve this user flow, we need to add one additional endpoint for GET event details, that will show the arena and seats, and one more to let users pay and confirm the booking.


[![alt_text](/assets/2026-02-08-ticketmaster-system-design-with-microsoft-engineer/image10.png "image_tooltip")](/assets/2026-02-08-ticketmaster-system-design-with-microsoft-engineer/image10.png "image_tooltip"){:target="_blank"}


Please note that this is a very bad approach, as we can have double booking.




<br>

### **Avoid double booking (2 persons had the same ticket/seat)**

This is a very interesting concurrency problem. It is possible to have double booking at the moment.

The scenario:



* there is event1
* user1 saw seat5 in state "free" and clicked on it to complete the payment
* user2 saw seat5 in state "free" and clicked on it to complete the payment
* user1 paid successfully -> webhook handler updates seat5 to be owned by user1 now
* user2 paid successfully -> webhook handler overrides seat 5 to be owned by user2 now
* Result: user1 and user2 paid for the ticket, but only user2 is assigned, user1 is upset

You have probably seen that when you select a seat on Ticketmaster, you get a 10 minutes timer to complete the payment. Let me explain what is going on and why this happens.




<br>

#### **Fix on Stripe side**

There might be a way to prevent this problem by using a deduplication mechanism on Stripe side. In case we can form the same eventid-seatid payment_intent_id, Stripe will not charge user2 as user1 has already paid. But this means severe coupling, relying on third party, and bad user experience.




<br>

#### **Leverage storage (optimistic concurrency / locking)**

Whenever you hear someone needs "exclusive access" to something, it almost always means Distributed Lock in System Design. But we have only 2 users, so it is overkill for now. Instead, we can add guards on our database.

How? Checking the database before doing payment is not enough


[![alt_text](/assets/2026-02-08-ticketmaster-system-design-with-microsoft-engineer/image6.png "image_tooltip")](/assets/2026-02-08-ticketmaster-system-design-with-microsoft-engineer/image6.png "image_tooltip"){:target="_blank"}


Typically you use locking when something needs exclusive access (one at a time). In databases you have two ways of doing that:



* **pessimistic locking**: SELECT FOR UPDATE -> UPDATE within the same transaction
* **optimistic locking**: READ row -> UPDATE WHERE r == row, can be 2 different transactions

The tradeoff is explained in Martin Kleppmann's book: 

[![alt_text](/assets/2026-02-08-ticketmaster-system-design-with-microsoft-engineer/image1.png "image_tooltip")](/assets/2026-02-08-ticketmaster-system-design-with-microsoft-engineer/image1.png "image_tooltip"){:target="_blank"}


tl;dr - if you have a lot of concurrent operations fighting for the same resource, use **pessimistic concurrency**. If you have just a couple or only edge cases, use **optimistic concurrency**.

For sure it won't help if we have only 2 states for the seat (**free, booked**), because we are updating from "**free**" to "**booked**" only after the user paid, which is too late - money is gone.

Therefore, we introduce a new state "**locked**" or "**selected**" that expresses the state when the user clicked on the seat but has not booked yet. Later on, when payment succeeds we update the status from "**locked**" to "**booked**".

```sql
-- we see status of the seat5 now free, so we straight away lock it using optimistic concurrency

SELECT * FROM seats WHERE id = 'seat5';

  -- depending on isolation level, this will either fail or return "rows_affected = 0". In both cases you know there is somebody else who has locked or booked the seat already
UPDATE seats SET status = 'locked' WHERE status = 'free'
```

This way double booking is not possible. However, the user might lock the seat and go for a walk for 3 hours. In that case we will run a background job to automatically reset the "lock" state after 10 minutes of inactivity, so let me introduce "updated_at" to our Seats entity.

Apart from solving this problem we also improved user experience. Now the user doesn't have to fill in payment information just to see that the seat was occupied long time ago - they will see it right away when they click on the seat.


[![alt_text](/assets/2026-02-08-ticketmaster-system-design-with-microsoft-engineer/image9.png "image_tooltip")](/assets/2026-02-08-ticketmaster-system-design-with-microsoft-engineer/image9.png "image_tooltip"){:target="_blank"}





<br>

## **Satisfy non-functional requirements**

Now given the working system, let's scale it to millions of users.




<br>

### **High load**

As we mentioned we might have 30-50M MAU => 7-10M DAU (daily active users). It is not that big actually. 10M / (24 * 60 * 60) = 115 users per second. Let's even add peak hours: 115 * 5 = 575. Let's also add the fact that a single user's action can trigger multiple requests, 575 * 5 = **2875 rps at most**.

Believe me, a really well vertically scaled Postgres can handle it with no problem. Let's add "semi" popular events, marketing spikes etc, and we might have something like 3-5k rps, and this is when it is better to scale.
 
Again, we don't talk about celebrity problems - it is not possible to solve it with scaling.




<br>

#### **Scale APIs / workers**

APIs are stateless, which means infinitely scalable - just spawn a lot of instances.


[![alt_text](/assets/2026-02-08-ticketmaster-system-design-with-microsoft-engineer/image5.png "image_tooltip")](/assets/2026-02-08-ticketmaster-system-design-with-microsoft-engineer/image5.png "image_tooltip"){:target="_blank"}





<br>

#### **Scale Storage**

Storage is stateful, meaning we must be careful with scaling. A typical approach is to scale horizontally with Sharding.

Hard to say what to use for scaling as we have different kinds of loads:



* we have search traffic that is not bound to specific events
* we have read traffic for specific events (checking arena, details)
* we have write traffic for specific seats

Options to shard by: events, seats. The answer here is to decouple storage first and scale it independently, because we will have different ratios of load for different types of operations.

**Step 1: Decouple storage**

We can put general information about the event to some fulltext search optimized storage that has a lot of indices to speed up the search and filtering.

Now we can put event details with seats to the simple reads/simple writes storage.

**Step 2: Shard storage**

For **Search Storage** we don't have parameters to shard by, so we will replicate data as it handles read heavy traffic.

For **Events Storage** we shard by events for different reasons: 



* we might want to allow the user to select 2-3 seats at the same time for payment - we will need extremely hard coordination if we shard by seat in that case
* it is much faster to read the whole seat map in a single request to a single node on read request


[![alt_text](/assets/2026-02-08-ticketmaster-system-design-with-microsoft-engineer/image7.png "image_tooltip")](/assets/2026-02-08-ticketmaster-system-design-with-microsoft-engineer/image7.png "image_tooltip"){:target="_blank"}


For rebalancing we can use either of three approaches:



* consistent hashing (needs coordination)
* rendezvous hashing (stateless but needs more operations)
* hashslot reshuffling (redis approach, needs coordination as well)

**Step 3: Use Distributed Lock**

In the case of a semi-popular event we will have a lot of "locking" and later "unlocking" if the users changed their mind. Besides that, booking and locking the seat are conceptually different, so we might apply Distributed Locking pattern. Another benefit here is in the case of RedLock - we can remove the background job that resets the "locked" state after 10 mins of inactivity.

This way we create a Redis instance, sharded by seats (can be by event as well, does not matter).

The flow works like this now:



* user tries to acquire a lock with SET NX "seatid". It will write to the redis "seatid" key only if it does not exist. The key is set to expire in 10 minutes automatically via TTL mechanism
* in case the user got the successful lock, he/she proceeds with payment and saves the result to postgres database

Please note that we need to enable "fsync" for every write to redis. Concurrency is not the issue, because Redis is single threaded.

If you are patient with details you will notice that there is an edge case now, if we have concurrent payment and locking at 9:59 TTL. It can be solved by prolonging TTL upon user's operation and playing with longer TTL.

	
[![alt_text](/assets/2026-02-08-ticketmaster-system-design-with-microsoft-engineer/image8.png "image_tooltip")](/assets/2026-02-08-ticketmaster-system-design-with-microsoft-engineer/image8.png "image_tooltip"){:target="_blank"}

Since we are using TTL - it means all the records will disappear from the distributed lock, even these ones that actually led to buying a seat. These cases we will fix:
* either by putting kafka that will handle webhook from stripe and update redis lock by making it permanent
* and/or by checking the state in Events Storage, after acquiring lock.

Let’s say seat5 was chosen by user1, and he bought it. Seat5 => booked. Now 10 minutes pass and we don’t have seat5 key in Redis. But by that time kafka should already distribute the update and make some worker to write seat5 key to redis permanently without TTL. User2 comes and gets rejected because the lock has already been acquired by somebody else.
If kafka was late, and user2 actually was able to acquire the lock - then API checks Events storage and sees the status for the seat is already “booked” - so user2 gets rejected.

[![alt_text](/assets/2026-02-08-ticketmaster-system-design-with-microsoft-engineer/image11.png "image_tooltip")](/assets/2026-02-08-ticketmaster-system-design-with-microsoft-engineer/image11.png "image_tooltip"){:target="_blank"}

Now, given a single event is not very popular, we can scale infinitely as we isolate event related information by sharding. But if we have a very popular event, like Taylor Swift, we are done. All requests will go to the same shard for Taylor's event and it will be down the whole time. We will talk about a solution later.

<br>

### **Kafka**

Kafka can be trivially scaled by using more partitions. It does not have any problem with rebalancing. Order does not matter here as well.

<br>

### **Availability and Consistency**

The general availability pattern is replication. APIs are already solved, let's talk about storages.




<br>

#### **Distributed lock high availability**

We need strong consistency and no data loss requirement, otherwise we will not be able to guarantee no double booking.

For this reason we **CANNOT do**:



* leader-follower async replication - prone to data loss on leader election
* leader-follower sync replication - no high availability as we cannot lose replica
* leaderless - due to data loss on conflicts/concurrency (last write win problem)
* leaderful - due to data loss on conflicts and not being strongly consistent

How do we approach this? The answer is simple:



* either we say that according to CAP theorem we cannot be highly available
* or we apply heavy RAFT consensus and then we can lose up to 49% of the nodes

Let's assume we are rich, so we do RAFT.




<br>

#### **Search storage**

We already applied leader-follower async replication for scaling purposes, so it is by default highly available. We don't have a strong consistency requirement here.




<br>

#### **Events Storage**

It must be strongly consistent to avoid data loss (as it is money data in a nutshell).

We cannot have high concurrency/conflicts per seat, because we allow only one client to write at a time due to Distributed lock. It means we can have the following replication strategies here:



* heavy RAFT - a bit overkill here
* leaderless replication with w + r > n quorum




<br>

#### **Kafka**

Kafka is highly available if we add replication to it -> so we can just increase replication factor

[![alt_text](/assets/2026-02-08-ticketmaster-system-design-with-microsoft-engineer/image4.png "image_tooltip")](/assets/2026-02-08-ticketmaster-system-design-with-microsoft-engineer/image4.png "image_tooltip"){:target="_blank"}

<br>

### **Spikes**

This is the most tricky requirement. While we might handle millions of requests in general in the system, having tens of thousands of same sized events, we cannot handle extremely popular events, like Lady Gaga or Taylor Swift.

There is published data that Taylor Swift got 3.5 B requests overall during sales. People estimated it to 40-200k requests per second. No single node can handle this number of requests.
 
The clear bottleneck here is Distributed Lock and Events Storage.




<br>

#### **Distributed Lock**

What usually happens: within the first minute people that are let in will lock ALL possible seats, and then they will be deciding whether to buy or not. While the whole arena is "free" it might not be that big of a deal. Assume 200k seats and around 200k requests - pretty manageable.

We can go to extremes and have Redis node per seat - seems like an easy fix.

But keep in mind the amount of people that want to buy a ticket is 3-5 M or even more. So they all are waiting and constantly reloading the page, and only 200k are "booking" at the moment.

Now it is enough for only a single seat to get "unlocked", and a whole burst of 2M people will try to click on it. Even if we are optimistic enough, and maybe only a small fraction of people out of 2M will go there, it is still 2-10k at least. A single node can never handle this.

It is clear - even if we have Redis Node per seat, for events like Taylor Swift it is not enough.




<br>

#### **Events storage**

Since we have sharding per event, it is even worse. However the situation is not that critical: since lock is necessary for API to allow payment and update status in Events Storage, we will be able to have at most a maximum number of seats per event writing concurrently. Arena that handles 200k seats will produce at max 200k concurrent writes (in reality it is much lower).

To scale further, we can shard by arena zones, or even go to extremes and shard by seats - then we clearly can handle write traffic.




<br>

### **Solution**


[![alt_text](/assets/2026-02-08-ticketmaster-system-design-with-microsoft-engineer/image2.png "image_tooltip")](/assets/2026-02-08-ticketmaster-system-design-with-microsoft-engineer/image2.png "image_tooltip"){:target="_blank"}


**North star: Virtual Waiting Room**

You all probably have seen the production solution for this. When you try to buy tickets for some popular event, you will get this page saying "you are X in the queue, wait until you are in".

It is called "Distributed Waiting room". Cloudflare has this offering: [https://www.cloudflare.com/application-services/products/waiting-room/](https://www.cloudflare.com/application-services/products/waiting-room/)

It is a separate system design problem. It is sort of a **Stateful Rate limiter** on steroids, and pretty complicated, so you don't want to design it during the interview.

With a virtual waiting room, you can have a guarantee of how many requests you receive per event, and it makes our system design good enough with the current state.

You won't find a system design solution on the internet for it, but I have it in my archive. Since it is pretty complicated and exclusive, it will go public only when my Telegram and Instagram has 1k subscribers and Youtube has 2k subscribers.

**Email campaign**

During my practical lecture, one student proposed to have an Email campaign that will send invitations for booking in batches. You send the first 5k people that subscribed by email - here is your link with a specific code that will let you in and buy a ticket, then next 5k and so on.

The problem here is that if even a single email link gets leaked into public, we are again in the same spot - up to 100-500k people are trying to follow this link and will overload the node that handles this invitation code.

**Straightforward rate limiter**

One working solution with terrible user experience is to put rate limiting on the "locking" operation. The bucket key would be seat id, so the rate limiter will just allow 1k rps and not more by discarding other requests randomly.




<br>

## **Conclusion**

I tried to go as deep as possible, as people seem to like it the most. Please put a reaction to the article below and provide your feedback about this solution. I will be happy to discuss technical doubts about this solution.

Please don't forget to subscribe to my social media: [telegram](https://t.me/programming_space), [instagram](https://www.instagram.com/andreyka26_se/), [x](https://x.com/andreyka26_), [tiktok](https://www.tiktok.com/@andreyka26__). Try out my pet projects: [SyncSymptom](https://syncsymptom.com/), [Pet4Pet](https://pet-4-pet.com/).

