---
layout: post
title: "Payment Gateway (Stripe) System Design with Microsoft Engineer"
date: 2025-12-02 10:19:01 -0000
category: System Design
tags: [system_design, architecture]
description: "In this article I will show how to do a system design of a scalable, highly available payment gateway aka Stripe. Read this guide before your system design interview. Explore and recall system design principles: replication (Raft, leader-leader, leaderless), sharding, consistent hashing, eventual consistency during this design."
thumbnail: /assets/2025-12-02-payment-gateway-stripe-system-design-with-microsoft-engineer/logo.png
thumbnailwide: /assets/2025-12-02-payment-gateway-stripe-system-design-with-microsoft-engineer/logo-wide.png
---

* TOC
{:toc}

<!-- Copy and paste the converted output. -->

<!-- You have some errors, warnings, or alerts. If you are using reckless mode, turn it off to see useful information and inline alerts.
* ERRORs: 0
* WARNINGs: 0
* ALERTS: 13 -->




<br>

## **Introduction**

Payment Gateway system design is pretty similar to Bank system design, with a lot of problems and complexities in common. The goal of the system is to allow businesses to make money out of goods/services by processing payments for them. 

We are going to design a full lifecycle starting from card details submitted by the customer ending with sending money to the merchant.

Note, that this system design requires a bit of domain knowledge about how payments, card networks and banks are working - you can find a very short section about it below.

Recorded mock for Stripe System Design can be found [here](https://www.youtube.com/watch?v=-5laXGtKInU).


<br>

## **Domain Background**

As I mentioned, for this system design you will need a bit of background knowledge about payment processing, card networks and banks.

Stripe is not a bank. It is an intermediary that helps move money from customer cards to merchant bank accounts.

Why are people using Stripe instead of implementing their own payment processing? Because in order to store and process card details, payments, and integrate with Card Networks and banks you will need to acquire tons of licenses, which is both time consuming and very expensive. In addition, you will pay huge fines if you don't follow high standards.




<br>

### **Terminology**

**Merchant's Customer** - our customers who want to buy goods / services.

**Merchant** - our direct customer that sells some goods or services

**Stripe** - us, Payment Gateway acts as the payment gateway and payment processor

**Acquiring bank** - Stripe’s (receiving) bank

**Card network** - Card payments processor, e.g. Visa, Mastercard, etc.

**Issuing bank** - the customer's bank. It issued the card the customer is paying with.

**Payout** - settling money from Stripe bank to Merchant’s bank.

**Ledger** - is a financial record system that tracks all transactions as paired entries - a debit and a credit (e.g., acc1 -$100; acc2 +$100). This two-sided format ensures every movement of money is balanced and traceable. It’s a legal requirement for payment processors, and all entries together should sum to zero.




<br>

### **Flow**

In general, flow looks like that:

1. The customer wants to pay with a card, so the merchant creates a Payment (payment intent) in Stripe.

2. Stripe sends the request to Card Network (Visa, MasterCard), as we are working with card details, not bank accounts.

3. Card Network transfers money from the customer's bank (issuing bank) to Stripe’s bank (acquiring bank).

4. Stripe records the transaction in the internal ledger, and charges a fee for money transfer

5. Stripe transfers funds from its bank to the merchant's bank account (payout)

Money transfer from customer to Stripe’s bank is performed using 3 steps:



* authorization transaction, which locks money on customer’s account, performs fraud check, etc
* capture request, idempotent request that actually confirms authorized transaction. It means money must be moved from sender to receiver
* settlement - is the final stage when the bank is moving money from one account to another account.

You can think about it as follows:



* authorization is operation in SQL transaction
* capturing is transaction’s commit
* settlement is replicating this commit to the follower node.

Resources:



* [Stripe: debit card payment](https://stripe.com/gb/resources/more/how-do-debit-card-payments-work-here-is-what-businesses-need-to-know)
* [Stripe: credit card payment](https://stripe.com/en-cz/resources/more/how-do-credit-card-networks-work)
* [Stripe: authorisation, capturing and settlement](https://stripe.com/en-cz/resources/more/credit-card-payment-authorization-and-transaction-settlement-process#what-is-capturing-and-settlement)




<br>

### **Reconciliation**

Once per couple of days banks are comparing their Ledger logs between each other to detect inconsistencies and rollback or rollout some of the transactions. That’s because banks communicate between each other asynchronously, and this is the only way to keep the state consistent.

Stripe, as payment processor, should perform regular reconciliation as well, especially in case of payouts to synchronize money between internal ledger’s transactions and merchant banks.




<br>

## **Requirements**

As always, we are following our plan:



* define functional and non-functional requirements
* satisfy functional requirements
* satisfy non-functional requirements
* follow ups




<br>

### **Functional Requirements**



* Merchant is able to register itself and webhook
* Customers are able to pay for merchant’s goods/services
* Merchant receives webhooks about its payment
* Merchant is getting money for goods/services on its bank account via Payout mechanism
* Ensure no double charge for the same item of good/service
* Audit - all transactions are stored in Ledger (legal requirement)




<br>

### **Non-Functional Requirements**



* High Traffic:
    * 500 M payment requests per day => 5787 rps => **10k rps** on peaks
    * 5B ledger events (change of transaction/payment state) per day => 57870 => **100k rps** on peaks
    * **2M merchants**
* CAP, availability vs consistency:
    * as **highly available** as possible
    * **Strong consistency** (linearizability) for payment processing (no double charge)
    * **Eventual consistency** for merchant’s related data, and ledger data
    * **No data loss** for ledger entries
* Correctness: 
    * debit and credit add up to zero
    * merchant receives webhook with “at least once” guarantee, retrying 30 days.
* Spikes: uneven per season (black Friday), and per merchant




<br>

## **Satisfy Functional Requirements**

Let’s try to design a system for a couple of users on a single machine just to make sure it will work and satisfy Functional requirements, then follow up with Non Functional requirements.


[![alt_text](/assets/2025-12-02-payment-gateway-stripe-system-design-with-microsoft-engineer/image13.png "image_tooltip")](/assets/2025-12-02-payment-gateway-stripe-system-design-with-microsoft-engineer/image13.png "image_tooltip"){:target="_blank"}





<br>

### **Merchant is able to register itself and webhook**

We can trivially satisfy this with simple API and storage. One endpoint that receives Merchant related information and stores it in a storage. In the real world it will be different types of data, e.g. webhook details, goods, logos, names, payment methods, etc. For security reasons we add api keys/secrets for API endpoints + signature for webhook validation.


[![alt_text](/assets/2025-12-02-payment-gateway-stripe-system-design-with-microsoft-engineer/image10.png "image_tooltip")](/assets/2025-12-02-payment-gateway-stripe-system-design-with-microsoft-engineer/image10.png "image_tooltip"){:target="_blank"}





<br>

### **Customers are able to pay for merchant’s goods/services**

There is a sequence of steps that need to be performed to move money from the customer to the merchant's bank.

`Step 1.` The customer goes to the page of payment details, expressing willingness to pay. This action sends a request to our Payment API

`Step 2.` API creates a payment entity with status “new”, merchant/goods related information. It will be used for deduplication later.

`Step 3.` The customer initiates payment by filling in card details and pressing the “Pay”. The client should encrypt data and send it along with the payment id created earlier.

`Step 4.` Payment API sends “Authorization” request to Card Network with customer’s card details. This step might include interactive flow and prompt customers to enter code, or confirm from the app. That flow will work on redirections the same way as OAuth.

`Step 5.` API saves the result of the Authorization transaction with “auth_id” to the database and updates status to “authorized”. Authorization id is a deduplication mechanism on Card Networks (see later).

`Step 6.` Payment API sends a “Capture” request to Card Network to move authorized money initialized by merchant, background job or within the same request straight away.

`Step 7.` The server saves “Captured” status to the payment in storage.

`Step 8.` Later on, the payout to merchants is happening via a background job that sends a batch of payments to the Merchant’s bank.

During step 1 -  step 7 inclusively, two extra steps are done every time: 



* sending an event to Merchant’s webhook.
* store transaction/event to Audit storage




<br>

### **Merchant receives webhooks about its payment**

As shown in the diagram webhook to Merchant’s API is sent on every payment update or event.




<br>

### **Merchant is getting money for goods/services**

At step 8, the money is transferred from Stripe's account to Merchant’s account via payout. Every now and then we collect all successful payments and transfer them to the merchant's bank by batch (with retries and reconciliation).


[![alt_text](/assets/2025-12-02-payment-gateway-stripe-system-design-with-microsoft-engineer/image5.png "image_tooltip")](/assets/2025-12-02-payment-gateway-stripe-system-design-with-microsoft-engineer/image5.png "image_tooltip"){:target="_blank"}





<br>

### **Ensure no double charge for the same item of good/service**

Two step card payment (auth, capture) is helping here a lot. On our side, as we have unique payment ids, double charge can happen only in case of concurrent requests / retries from the client.

We will use Optimistic concurrency with Compare-and-swap (CAS) for that. When customer clicked “Pay” (POST /payment/:id) first we set status of the payment to “Authorizing” 


```sql 
UPDATE payments SET status = ‘authorizing’ WHERE id = $id AND status = ‘new’
```

Only in case of success (rows affected > 0) - we proceed to sending “Auth” requests to Card Network. This way if 2 concurrent threads try to call this endpoint for the same payment ID (client is retrying / concurrency issue) - only one of them will proceed with actually “Authorizing” and locking the customer's money.

When we got response from Card Network, we update payments again

```sql 
UPDATE payments SET status = ‘authorized’ auth_id = $auth_id WHERE id = $id AND status = ‘authorizing’
```

Capturing then is idempotent on the Card Network side, so we can send multiple “capture” requests for the same auth_id and be on the safe side.




<br>

### **Audit - all transactions are stored in Ledger**

As shown in the diagram we are writing a ledger entry to Audit Storage on every payment update or event.


[![alt_text](/assets/2025-12-02-payment-gateway-stripe-system-design-with-microsoft-engineer/image8.png "image_tooltip")](/assets/2025-12-02-payment-gateway-stripe-system-design-with-microsoft-engineer/image8.png "image_tooltip"){:target="_blank"}





<br>

### **Drawbacks**

Current architecture will work in a happy path and low traffic, but it has a lot of flaws:



* How to handle payouts failures? What if the bank acknowledged it but the background job died before saving it to the database? How in general ensure the bank has the same payouts as our internal storage?
* How to guarantee webhook delivery to merchants if the merchant API is down for one day?
* What to do if API died before sending transaction data to Audit storage? In that case we violate the law by not having full ledger logs.
* Scalability / Availability issues are still there. We cannot afford more than a few thousands payments per second, and we cannot failover in case some component stopped working.

Don’t worry all of these points are covered in the section below.




<br>

## **Satisfy Non-Functional Requirements**

Now that our system works on a couple of users and a couple of machines, let’s make it Stripe’s size.


[![alt_text](/assets/2025-12-02-payment-gateway-stripe-system-design-with-microsoft-engineer/image4.png "image_tooltip")](/assets/2025-12-02-payment-gateway-stripe-system-design-with-microsoft-engineer/image4.png "image_tooltip"){:target="_blank"}





<br>

### **Introduce Kafka for side effects**

Before deep diving into non functional requirements I would like to add one pattern that will ease our life. You can see that when customer pays money we have a lot of side effects:



* sending webhook to merchant
* save payment update to audit log
* it might be more, e.g. notifications, some derived storages, etc

These operations are independent and can be randomly failed, delayed.

Therefore let’s introduce a well known pattern: message broker with multiple workers per side effect.


[![alt_text](/assets/2025-12-02-payment-gateway-stripe-system-design-with-microsoft-engineer/image6.png "image_tooltip")](/assets/2025-12-02-payment-gateway-stripe-system-design-with-microsoft-engineer/image6.png "image_tooltip"){:target="_blank"}





<br>

### **Correctness**

To guarantee at least one delivery to a Merchant's Webhook we need to store information about webhook delivery, as workers can randomly die, merchant API might be down for hours/days, etc.

Since we cannot lose data for our Audit requirements, we are using the same mechanism here as well with “at least once” semantics (basically retry infinitely).


[![alt_text](/assets/2025-12-02-payment-gateway-stripe-system-design-with-microsoft-engineer/image3.png "image_tooltip")](/assets/2025-12-02-payment-gateway-stripe-system-design-with-microsoft-engineer/image3.png "image_tooltip"){:target="_blank"}





<br>

### **High Traffic & Scalability**

A typical strategy for scaling traffic is to distribute the load as evenly as possible between the machines. It applies for both storage and compute.




<br>

#### **Payment API**

Since stateless - trivially scaled with adding more instances in multiple regions/geos along with loadbalancers.


[![alt_text](/assets/2025-12-02-payment-gateway-stripe-system-design-with-microsoft-engineer/image11.png "image_tooltip")](/assets/2025-12-02-payment-gateway-stripe-system-design-with-microsoft-engineer/image11.png "image_tooltip"){:target="_blank"}





<br>

#### **Payment Storage**

Since our load is mostly write heavy - we are applying sharding along with consistent/rendezvous hashing for rebalancing. The key would be payment id for even distribution of the records, as merchants can cause hotspots and can overload single instances (if they are too big). 


However, you might say that it will create scatter/gather load on our shards for the Merchant's dashboard, and you will be right - this is a scalability bottleneck.

[![alt_text](/assets/2025-12-02-payment-gateway-stripe-system-design-with-microsoft-engineer/image1.png "image_tooltip")](/assets/2025-12-02-payment-gateway-stripe-system-design-with-microsoft-engineer/image1.png "image_tooltip"){:target="_blank"}

Another problem here is that if we shard by payment id, how is our coordinator/client going to know where a specific merchant's data is located?

The best approach here would be to use derived data and sync the payments data to another storage that is optimized for querying, aggregation and will be sharded by merchant id. Let’s name such storage “Merchant Storage”, and move all merchant related data along with payments needed for the merchant dashboard there.




<br>

#### **Merchant Storage**

As discussed above - we are sharding it by merchant id because we want to retrieve merchant related data. For rebalancing - well known consistent/rendezvous hashing. For too hot merchants - we can isolate them and handle them separately as per “celebrity problem”.


[![alt_text](/assets/2025-12-02-payment-gateway-stripe-system-design-with-microsoft-engineer/image9.png "image_tooltip")](/assets/2025-12-02-payment-gateway-stripe-system-design-with-microsoft-engineer/image9.png "image_tooltip"){:target="_blank"}





<br>

#### **Audit Storage**

We don’t know how this database is going to be queried, so it is not easy to come up with a universal sharding strategy here. Let’s add sharding by payment, same as our Payment Storage. This will be enough to prove that it will scale well. If the intention is to query it by some ranges, run aggregations - then something more advanced should be done as a sharding strategy.




<br>

#### **PaymentEvents Queue**

Kafka is trivially getting sharded (partitioned)  by payment id for ordering within the same payment.




<br>

#### **Workers, background job**

The workers are trivially scaled together with kafka partitions as they are stateless computes.




<br>

#### **Retry/Job Storage**

The storage can be sharded by job id trivially as well. Background jobs might query the job by “type” field from multiple shards. We will just apply an index on top of it.




<br>

### **CAP, availability vs consistency**

For sure we want our Stripe to never be down. This section covers high availability of our components.




<br>

#### **Payment API**

Already solved by scaling (replication), as it is stateless.




<br>

#### **Payment Storage**

First of all, we are not allowed to lose payment data, so we cannot use Leader-Follower replication.

We have to provide a linearizability consistency guarantee here, because we process the payments and we are relying on their "freshness". Without a recency guarantee we will be doing unnecessary operations to the Card Network.

So the call here is Consensus based replication (Raft, Paxos).




[![alt_text](/assets/2025-12-02-payment-gateway-stripe-system-design-with-microsoft-engineer/image7.png "image_tooltip")](/assets/2025-12-02-payment-gateway-stripe-system-design-with-microsoft-engineer/image7.png "image_tooltip"){:target="_blank"}





<br>

#### **Merchant Storage**

This is fully eventually consistent storage, as it is not critical if payment info will appear 1-2 hours later than it actually happened. Therefore the natural solution for availability is Leader-Follower async replication. The only problem here is possible data loss. I believe we can persuade the Product people that it is okay to lose data for the merchant dashboard. If not - then we can do the same consensus algorithm as above, or Leader-Leader/Leaderless.

In any case, the actual payment is based on Audit storage, not Merchant storage.




<br>

#### **Audit Storage**

Leader-Follower replication is not feasible here because we have legal requirements to not lose data in this storage. However we don't have to be linearizable either, because we are only syncing data into one place, meaning we are eventually consistent.

The solution here is Leaderless or Leader-Leader replication. We can afford it because we won’t have concurrency on the same PaymentUpdate object/row, and we don’t make decisions based on its data.


[![alt_text](/assets/2025-12-02-payment-gateway-stripe-system-design-with-microsoft-engineer/image12.png "image_tooltip")](/assets/2025-12-02-payment-gateway-stripe-system-design-with-microsoft-engineer/image12.png "image_tooltip"){:target="_blank"}





<br>

#### **Payment Events Queue**

We can easily add more replicas to kafka with quorum to not lose data and be highly available.




<br>

#### **Workers, background job**

Can easily be replicated like the Payment API, since they are stateless. We have at least once delivery - we are good to go and don't need to worry about double processing.


[![alt_text](/assets/2025-12-02-payment-gateway-stripe-system-design-with-microsoft-engineer/image2.png "image_tooltip")](/assets/2025-12-02-payment-gateway-stripe-system-design-with-microsoft-engineer/image2.png "image_tooltip"){:target="_blank"}





<br>

#### **Retry/Job Storage**

Since we have "at least once" guarantee here, we cannot lose the data in this storage. However, with background job semantics, we also don't need linearizability. Therefore here we can use either leaderless or leader-leader.




<br>

## **Conclusion**

I hope you find this system design useful, please share your thoughts on the decisions made here in the comment section or in my social media. 
 
Don’t forget to subscribe to not miss next system design problems.

