---
layout: post
title: "SSL / TLS / mTLS for System Design in simple words"
date: 2026-06-07 23:47:11 -0000
category: Infrastructure
tags: [system_design, architecture, infrastructure]
description: "Learn TLS, mTLS, and certificates for System Design interviews in simple words: encryption, signatures, ECDSA, ECDHE, PKI, chain of trust, and the TLS handshake explained step by step."
thumbnail: /assets/2026-06-08-ssl--tls--mtls-for-system-design-in-simple-words/logo.png
thumbnailwide: /assets/2026-06-08-ssl--tls--mtls-for-system-design-in-simple-words/logo-wide.png
---

* TOC
{:toc}

<br>

## **Introduction**

After I switched to Snowflake, I found out that I had a lot of gaps in the Networks and Security areas once I started working closely on low-level things.

Today we are going to cover the encryption/security fundamentals that you need for a System Design interview and your day-to-day work. We will mainly focus on TLS and mTLS, along with certificates, chain of trust, custom PKI, and the underlying internals of it. Diagrams, code examples are included.



<br>

## **Terminology**

The cryptography and encryption topic seems hard, first of all, because of the tons of abbreviations and terms that seem unfamiliar. One of the first steps towards understanding is being able to easily operate with these terms.

For now you can skip reading them and just return to this chapter as you read the article.

**TLS** - Transport Layer Security

**RSA** (**Rivest–Shamir–Adleman**) - both encryption and signature algorithm, pretty heavy and now considered legacy in TLS.

**MAC** (**Message Authentication Code aka Authentication tag**) - a sort of signature that is computed over the payload and added to it to confirm that the payload hasn’t been changed. Typically it is implemented as some hashing with a MAC secret key involved. Examples: **GHASH**, **HMAC**.

**AEAD** (**Authenticated Encryption with Associated Data**) - encryption + signature (to ensure the encrypted data was not tampered with). The most commonly used AEAD is **AES-GCM**, which computes the encrypted bytes (AES part) in parallel per block and then generates a **GHASH MAC** over them (GCM part).

**HKDF** (**HMAC-based Key Derivation Function**) - a function that can deterministically derive a bunch of different keys, needed for signing and encrypting, from a single shared key.

**ECDSA** (**Elliptic Curve Digital Signature Algorithm**) - a signature creation and verification approach using a public and private key derived from the Elliptic Curve formula.

**ECDH** (**Elliptic Curve Diffie-Hellman**) / **ECDHE** (**Elliptic Curve Diffie-Hellman Ephemeral**) - shared secret derivation from private and public keys using the Elliptic Curve formula.

**ASN.1 (Abstract Syntax Notation One)** - schema/structure definition, like JSON.

**DER (Distinguished Encoding Rules)** - binary encoding for **ASN.1** data.

**PEM** - textual (base64) encoding of **DER**, with headers marking what the payload is: {-----BEGIN PRIVATE KEY-----}, {-----BEGIN CERTIFICATE-----}, {-----BEGIN PUBLIC KEY-----}.

**TbsCertificate** - To Be Signed Certificate, contains subject, issuer, validity, **public key**, serial number, extensions.

**Certificate** - a specific **ASN.1** structure (**Certificate ::= SEQUENCE { tbsCertificate, signatureAlgorithm, signatureValue }**) encoded as **DER** (optionally encoded to **PEM**).




<br>

## **What is TLS and why bother?**

TLS is a protocol that is needed to ensure the communication over the network is secured, not readable, and not malformed by a middleman.

Keep in mind we won’t consider SSL here, as it is deprecated and not really used anymore.

Keeping our TCP / IP stack in mind, where is it? Let’s recall the stack itself [TCP/IP Illustrated Volume 1 by Richard Stevens]:


[![alt_text](/assets/2026-06-08-ssl--tls--mtls-for-system-design-in-simple-words/image5.png "image_tooltip")](/assets/2026-06-08-ssl--tls--mtls-for-system-design-in-simple-words/image5.png "image_tooltip"){:target="_blank"}


TLS / SSL is the layer that works on top of the Transport layer (TCP is required as a delivery guarantee). It is worth noting that the default TLS/SSL implementation runs in user space rather than kernel space.

 
But still, it is hard to put it fully into the Application layer, as TLS is an intermediate layer between Transport (TCP) and Application (HTTP). Under the hood, SSL is just a user space library running on, or used by, the Application server, so for TCP it is opaque, since TCP just operates over the bytes (it does not matter whether they are encrypted or not).

So at the same time TLS is considered a separate layer, a part of the Application layer, and NOT a layer at all.


[![alt_text](/assets/2026-06-08-ssl--tls--mtls-for-system-design-in-simple-words/image10.png "image_tooltip")](/assets/2026-06-08-ssl--tls--mtls-for-system-design-in-simple-words/image10.png "image_tooltip"){:target="_blank"}





<br>

### **The purpose**

The application of TLS is very simple: when you transfer data over the network, typically you don’t want it to be readable by other parties, and you don’t want to receive malformed data without knowing it.

These are the problems that are solved by **TLS**:



* Confidentiality (Encryption): it encrypts the data transferred between client and server, so whoever captures the packet won’t be able to decrypt it.
* Authentication (Signature): it ensures the data is coming from a trusted side (you don’t want to mistakenly send a card number to a malicious actor who tricked you into believing they are the bank, e.g. via Typosquatting).
* Integrity (Signature): it ensures the data wasn’t malformed while being transferred over the network, so servers receive exactly what the clients have sent.




<br>

### **Encryption**

Encryption is used to transform the original text into a byte stream that is completely opaque when intercepted, and that is then transformed back on the receiving side using some sort of keys.

We have 2 different types of encryption: asymmetric and symmetric. They have different pros/cons and usually serve different purposes.




<br>

#### **Asymmetric encryption**

Needs 2 keys for encryption: public and private.

It all works because of the math magic with prime numbers. In simple words, you can find two numbers `private_key` and `public_key` such that: 

`decrypt(encrypt(message, public_key), private_key) == message`.


[![alt_text](/assets/2026-06-08-ssl--tls--mtls-for-system-design-in-simple-words/image4.png "image_tooltip")](/assets/2026-06-08-ssl--tls--mtls-for-system-design-in-simple-words/image4.png "image_tooltip"){:target="_blank"}


For client/server communication we do:



* Server generates 2 keys: `sprivate`, `spublic`
* Client generates 2 keys: `cprivate`, `cpublic`
* Server provides `spublic` to client, client provides `cpublic` to server.
* Server sends a message and encrypts it with `cpublic`. Client decrypts with `cprivate`
* Client sends a message and encrypts it with `spublic`. Server decrypts with `sprivate`

The math magic is called **RSA** (Rivest–Shamir–Adleman, the most popular asymmetric encryption and signature algorithm). It works by generating 2 huge prime numbers, deriving a private and public key from them, then encrypting/decrypting using these private and public keys. 

Note also that these keys are essentially big numbers (bytes), as are the cipher and message. The trick here is that, knowing only the public key, it is very hard/almost impossible to brute-force the private key and therefore decrypt.

We see the main benefit of asymmetric encryption: we don’t have problems sharing the key, as the public key is very safe to distribute. But on the other hand, it is extremely slow for encryption and needs more CPU and time compared to symmetric encryption.




<br>

#### **Symmetric encryption**

Works over a single shared key that both server and client know. In short, encryption is usually deterministic byte operations performed with the shared secret + a bunch of derived keys, thus making it reversible. 
 
For client/server communication we do:



* Somehow distribute the same shared key to the client and to the server.
* Both server and client derive 2 keys: a **server->client shared key** used only when the server sends a message to the client, and a **client->server shared key** used only when the client sends a message to the server. From both of them they generate a bunch of other secret keys that are used for encryption and signature. This is done to make it less guessable.
* Client encrypts data and signs with **client -> server shared key**. Server decrypts it using the same **client -> server shared key**.
* Server encrypts data and signs with **server -> client shared key**. Client decrypts it using the same **server -> client shared key**.


[![alt_text](/assets/2026-06-08-ssl--tls--mtls-for-system-design-in-simple-words/image8.png "image_tooltip")](/assets/2026-06-08-ssl--tls--mtls-for-system-design-in-simple-words/image8.png "image_tooltip"){:target="_blank"}


Symmetric encryption is faster than asymmetric. There is only one problem: how to exchange the shared key securely?




<br>

## **Signature**

A signature is a set of bytes computed from some payload using a cryptographic algorithm (RSA or ECDSA), that can be used to prove the message wasn’t malformed and was sent by the real owner.

It does not change the payload itself (it stays plain and visible to any middleman), but it adds an additional part at the end that the receiver can use to validate the integrity and authenticity of the payload.

Signatures are mainly used in TLS certificates to validate the certificate itself, including the chain of parent certificates.

There are 2 main algorithms: **ECDSA** (ES256) and **RSA** (RS256).

ECDSA is mainly used as it is easier to compute (requires less CPU and time) and needs less space for the signature, while still providing the same security guarantees.




<br>

### **ECDSA (Elliptic curve)**

In modern TLS, the most useful algorithm for signatures is ECDSA, which is a geometry-based method built on an elliptic curve function. 


[![alt_text](/assets/2026-06-08-ssl--tls--mtls-for-system-design-in-simple-words/image9.png "image_tooltip")](/assets/2026-06-08-ssl--tls--mtls-for-system-design-in-simple-words/image9.png "image_tooltip"){:target="_blank"}


To not go into too much math detail:



* signing: we take the starting point on the elliptic curve and perform scalar multiplication `private_key` number of times (point addition), thus getting the end value (`public_key`, which is just X, Y). Then we compute the `result` using a formula from the `private_key`, the hash of the payload, and the `public_key` (+ a nonce).
* verifying: the receiver is given the `result`, `public_key`, and payload. By recomputing a curve point, it is possible to verify that the computed x coordinate and the passed x coordinate do match.


[![alt_text](/assets/2026-06-08-ssl--tls--mtls-for-system-design-in-simple-words/image13.png "image_tooltip")](/assets/2026-06-08-ssl--tls--mtls-for-system-design-in-simple-words/image13.png "image_tooltip"){:target="_blank"}





<br>

### **RSA**

Signing using RSA is pretty similar to encryption. The same math trick is used: you take two huge prime numbers and derive private and public keys from them. The signature is just an encrypted cipher over the hashed payload (with different padding for security reasons).


[![alt_text](/assets/2026-06-08-ssl--tls--mtls-for-system-design-in-simple-words/image12.png "image_tooltip")](/assets/2026-06-08-ssl--tls--mtls-for-system-design-in-simple-words/image12.png "image_tooltip"){:target="_blank"}





<br>

## **Agree on shared key / ECDHE (Elliptic curve)**

Previously we concluded that symmetric encryption is cheaper and faster than asymmetric.

There is only one concern left: how can we agree on the same shared secret over an untrusted network?

Mathematicians solved this problem for us engineers a long time ago. The method is called **ECDHE** (Elliptic Curve Diffie-Hellman Ephemeral) — yes, elliptic curves again.


[![alt_text](/assets/2026-06-08-ssl--tls--mtls-for-system-design-in-simple-words/image6.png "image_tooltip")](/assets/2026-06-08-ssl--tls--mtls-for-system-design-in-simple-words/image6.png "image_tooltip"){:target="_blank"}


It works using the same private/public key derivation on an elliptic curve:



* The client takes the starting point on the elliptic curve and performs scalar multiplication `private_key` number of times (point addition), thus getting the end value (`public_key`, which is just an X coordinate).
* The server takes the starting point on the elliptic curve and performs scalar multiplication `private_key` number of times (point addition), thus getting the end value (`public_key`, which is just an X coordinate).
* Client gets the Server’s `public_key`.
* Server gets the Client’s `public_key`.
* Both client and server will arrive at the same `shared_secret` given the keys they have, because of the math properties of elliptic curves.

Note that this `shared_secret` is never used raw; we run HKDF functions to derive more keys from this single shared key and then use them for symmetric encryption.




<br>

## **Certificates**

This was probably one of the most mysterious topics for me. The terminology helped me.

A certificate is just a bunch of metadata: issuer, subject name, expiry, etc., along with a public key. All this metadata is signed using some private key. These 3 parts — metadata, public key, and signature — are presented in a special format called **ASN.1**.

**DER** is the binary encoding for **ASN.1** data. **PEM** and .pem files are just the textual (base64) encoding of **DER**.

A certificate is usually generated using an ECDSA pair, where the public key is encoded into the certificate and the signature is produced using the private key and the body of the certificate.

You can think about the certificate as a JWT that the server presents to you, so that you can verify this website is legitimate.


[![alt_text](/assets/2026-06-08-ssl--tls--mtls-for-system-design-in-simple-words/image3.png "image_tooltip")](/assets/2026-06-08-ssl--tls--mtls-for-system-design-in-simple-words/image3.png "image_tooltip"){:target="_blank"}


Generally anyone can just generate an ECDSA key pair and issue a self-signed certificate, and then substitute it as a middleman on the way to the client. That way, the client will agree on a shared key with the middleman, and the middleman can serve as a proxy, decrypting and reading all the messages.

So how does the client differentiate which certificate was really issued by the server and which one was not?




<br>

### **PKI / Chain of Trust**

People generally agreed on a few Root CAs (certificate authorities) that can issue new certificates. A Root CA is just a server that holds a private key and a public certificate, and can issue new certificates using its private key.


[![alt_text](/assets/2026-06-08-ssl--tls--mtls-for-system-design-in-simple-words/image7.png "image_tooltip")](/assets/2026-06-08-ssl--tls--mtls-for-system-design-in-simple-words/image7.png "image_tooltip"){:target="_blank"}


Since the internet grew, and private keys are extremely sensitive information, a new layer of certificates called the Intermediate CA was added. These are usually used to issue new certificates.

All browsers agreed to distribute Root CA public keys so that clients can easily tell whether the leaf + intermediate certificates come from a root or not.


[![alt_text](/assets/2026-06-08-ssl--tls--mtls-for-system-design-in-simple-words/image2.png "image_tooltip")](/assets/2026-06-08-ssl--tls--mtls-for-system-design-in-simple-words/image2.png "image_tooltip"){:target="_blank"}


During the TLS handshake the certificate chain is validated like this:



* the server signs all previous handshake TLS messages with the Leaf server’s private key.
* the client then: 
    * validates that signature with the leaf certificate that the server presents
    * validates the leaf certificate against the intermediate certificate (which the server attaches too)
    * validates the intermediate certificate against the root certificate that is already distributed to the client


[![alt_text](/assets/2026-06-08-ssl--tls--mtls-for-system-design-in-simple-words/image11.png "image_tooltip")](/assets/2026-06-08-ssl--tls--mtls-for-system-design-in-simple-words/image11.png "image_tooltip"){:target="_blank"}





<br>

## **How does TLS work?**


[![alt_text](/assets/2026-06-08-ssl--tls--mtls-for-system-design-in-simple-words/image1.png "image_tooltip")](/assets/2026-06-08-ssl--tls--mtls-for-system-design-in-simple-words/image1.png "image_tooltip"){:target="_blank"}


Now, given all the prerequisite background, we can grasp what is going on in the TLS layer:



* **ClientHello**: the client generates ECDHE keys `c_priv` and `c_pub` and sends `c_pub` along with supported ciphers, curves, nonce, etc.
* **ServerHello**: the server generates ECDHE keys `s_priv` and `s_pub`, and sends the chosen cipher, nonce, etc.
* Client and Server compute `shared_secret` using the ECDHE algorithm. `Server’s shared = ECDHE(s_priv, c_pub)`, `Client’s shared = ECDHE(c_priv, s_pub)`.
* From `shared_secret` they derive, using the HKDF function, a bunch of keys that are going to be used for the actual encryption.
* **Certificate**: the Server sends its certificate to the client.
* **CertificateVerify**: the Server sends a hash over all the previous TLS messages along with a signature created from the Leaf’s private key.
* **ServerFinished**: the Server computes the final e2e encryption key along with an HMAC over all the messages sent to the client so far.
* Client validates the certificate chain (leaf -> intermediate -> root).
* Client validates the leaf certificate from the CertificateVerify message and the Leaf cert’s public key.
* **ClientFinished**: the Client verifies the HMAC from the Finished message matches the one it calculated from all the messages it received, and sends its own HMAC to the server.
* Server validates the client’s Finished HMAC.

The beauty of this method is that everything happens over an open network, and any middleman can sit there and see the communication but can’t do anything about it. Besides that, the generated encryption keys, as well as the `shared_secret`, are only for the current TLS session. Even if they are compromised, the malicious actor can only decrypt a single session’s messages.




<br>

## **Practical application**

One of the most common applications of all of the above that I have seen is mTLS between internal components.

mTLS is mutual TLS, meaning server1 presents its own certificate to server2, and server2 presents its own certificate to server1. Thus they both authorize each other, so not only does server1 know it is talking to a trusted server2, but server2 also knows the request is coming from a trusted server1.

Another approach that I have seen is a custom PKI, where you control how, where, and to whom certificates can be issued. You could build different chains of trust, thus limiting the disjoint sets of components that can talk to each other.

The last example would be the case when you want to establish an ephemeral encryption key per session without TLS: you can implement a custom ECDHE (using libraries, of course).




<br>

## **Conclusion**

Hope you found something useful for yourself here. I'm not including the math background, as it would make the article extremely long.

This article is pretty much a refined version of my personal notes, because sometimes my brain errors out trying to recall how this chain of trust works, who checks whose signature, which private key is used to generate which signature, etc.

The diagrams here help me recall everything within 1 minute and move on.

Github repo: [https://github.com/andreyka26-git/andreyka26-distributed-systems/tree/main/Tls](https://github.com/andreyka26-git/andreyka26-distributed-systems/tree/main/Tls)

Don’t forget to sub to my [telegram](https://t.me/programming_space), [instagram](https://www.instagram.com/andreyka26_se/), [threads](https://www.threads.com/@andreyka26_se), [X](https://x.com/andreyka26_), as we are running polls for the next topic to discuss (like TLS today).

