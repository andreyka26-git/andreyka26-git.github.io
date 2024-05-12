---
layout: post
title: "How to block ping (ICMP) requests using ufw"
date: 2024-04-22 11:02:35 -0000
category: ["Infrastructure"]
tags: [ubuntu, infrastructure, ufw, firewall, security]
description: "In this article we are learning to block ping requests to our server using ufw (uncomplicated firewall) on our ubuntu server. After it the ping requests will fail (request timeout)."
thumbnail: /assets/2024-04-23-how-to-block-ping-icmp-requests-using-ufw/logo.png
thumbnailwide: /assets/2024-04-23-how-to-block-ping-icmp-requests-using-ufw/logo-wide.png
---

<br>

* TOC
{:toc}

<!-----

You have some errors, warnings, or alerts. If you are using reckless mode, turn it off to see inline alerts.
* ERRORs: 0
* WARNINGs: 0
* ALERTS: 3

Conversion time: 1.492 seconds.


Using this Markdown file:

1. Paste this output into your source file.
2. See the notes and action items below regarding this conversion run.
3. Check the rendered output (headings, lists, code blocks, tables) for proper
   formatting and use a linkchecker before you publish this page.

Conversion notes:

* Docs to Markdown version 1.0β35
* Tue Apr 23 2024 09:57:27 GMT-0700 (PDT)
* Source doc: How to block ping (ICMP) requests ufw
* This document has images: check for >>>>>  gd2md-html alert:  inline image link in generated source and store images to your server. NOTE: Images in exported zip file from Google Docs may not appear in  the same order as they do in your doc. Please check the images!

----->



<br>

## **Why would you want to read this article**

I have a server where I deploy my applications. I’m using [ufw (UncomplicatedFireWall)](https://wiki.ubuntu.com/UncomplicatedFirewall)  for firewall. I blocked everything except 2 ports: 443, 80. At some point I wanted to make my server unreachable for ping requests. 

But whatever I tried it did not work, because `ping` underhood is using `ICMP` (Internet Control Message Protocol) echo requests.

In this article we are going to make our server block all `ping` requests, in case you need to do it.


<br>

## **Install UFW**

The prerequisite for this is to have a `ufw` tool installed

`sudo apt install ufw`

<br>

## **Disable ping**

<br>

### **Edit `/etc/ufw/before.rules`**

Comment these lines (I’m using [nano](https://help.ubuntu.com/community/Nano), but you also can use default vim)

```
# commenting the lines below to block ping requests (icmp protocol) by ufw

# ok icmp codes for INPUT
-A ufw-before-input -p icmp --icmp-type destination-unreachable -j ACCEPT
-A ufw-before-input -p icmp --icmp-type time-exceeded -j ACCEPT
-A ufw-before-input -p icmp --icmp-type parameter-problem -j ACCEPT
-A ufw-before-input -p icmp --icmp-type echo-request -j ACCEPT

# ok icmp code for FORWARD
-A ufw-before-forward -p icmp --icmp-type destination-unreachable -j ACCEPT
-A ufw-before-forward -p icmp --icmp-type time-exceeded -j ACCEPT
-A ufw-before-forward -p icmp --icmp-type parameter-problem -j ACCEPT
-A ufw-before-forward -p icmp --icmp-type echo-request -j ACCEPT
```

So it becomes this:


[![alt_text](/assets/2024-04-23-how-to-block-ping-icmp-requests-using-ufw/image1.png "image_tooltip")](/assets/2024-04-23-how-to-block-ping-icmp-requests-using-ufw/image1.png "image_tooltip"){:target="_blank"}


<br>


### **Check it works**

Let’s try to ensure ping request is still working before we restarted ufw:

[![alt_text](/assets/2024-04-23-how-to-block-ping-icmp-requests-using-ufw/image2.png "image_tooltip")](/assets/2024-04-23-how-to-block-ping-icmp-requests-using-ufw/image2.png "image_tooltip"){:target="_blank"}


<br>

### **Restart & Make sure it does not work**

`ufw reload`

And then try ping request again:


[![alt_text](/assets/2024-04-23-how-to-block-ping-icmp-requests-using-ufw/image3.png "image_tooltip")](/assets/2024-04-23-how-to-block-ping-icmp-requests-using-ufw/image3.png "image_tooltip"){:target="_blank"}


<br>

## **Conclusion**

Hope it helps. I am not sure what can be the reason to do it, I guess you have one.

Please subscribe to my social media to not miss updates.: [Instagram](https://www.instagram.com/andreyka26_se), [Telegram](https://t.me/programming_space)

I’m talking about life as a Software Engineer at Microsoft.

<br>

Besides that, my projects:

Symptoms Diary: [https://symptom-diary.com](https://symptom-diary.com)

Pet4Pet: [https://pet-4-pet.com](https://pet-4-pet.com)
