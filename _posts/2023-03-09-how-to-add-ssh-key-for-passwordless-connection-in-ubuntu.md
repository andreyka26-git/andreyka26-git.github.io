---
layout: post
title: "How to add ssh key for passwordless connection in Ubuntu"
date: 2023-03-09 11:02:35 -0000
category: ["Infrastructure"]
tags: [infrastructure]
description: "In this article we are going to configure passwordless ssh connection from your client machine to the linux server. This is step-by-step guide about how to change standard ssh connection using username and password to only username plus private/public ssh key pair."
thumbnail: /assets/2023-03-09-how-to-add-ssh-key-for-passwordless-connection-in-ubuntu/logo.png
thumbnailwide: /assets/2023-03-09-how-to-add-ssh-key-for-passwordless-connection-in-ubuntu/logo-wide.png
---

* TOC
{:toc}

<!-- Output copied to clipboard! -->

<!-----

You have some errors, warnings, or alerts. If you are using reckless mode, turn it off to see inline alerts.
* ERRORs: 0
* WARNINGs: 0
* ALERTS: 3

Conversion time: 1.217 seconds.


Using this Markdown file:

1. Paste this output into your source file.
2. See the notes and action items below regarding this conversion run.
3. Check the rendered output (headings, lists, code blocks, tables) for proper
   formatting and use a linkchecker before you publish this page.

Conversion notes:

* Docs to Markdown version 1.0β34
* Fri Mar 10 2023 06:55:54 GMT-0800 (PST)
* Source doc: How to add ssh key for passwordless connection in ubuntu
* This document has images: check for >>>>>  gd2md-html alert:  inline image link in generated source and store images to your server. NOTE: Images in exported zip file from Google Docs may not appear in  the same order as they do in your doc. Please check the images!

----->



## **Why you may want to read this article**

Multiple times, I have configured different ubuntu machines and set up all infra for CI/CD and infra inside the servers.

The first thing I usually do is change ssh access to passwordless with public/private ssh keys from the machine. So you can connect to the server only from your machine.

This article is a step-by-step guide about how to create an ubuntu user, how to configure your ssh key on the Client (your machine), and how to configure passwordless access in your Server.

<br>


## **Optional: Working with files in ubuntu**

You could use whatever tool in Ubuntu you want, but I prefer `nano`, because it is simpler than default `vim`.

```
apt install nano
```

To open file

```
nano <filename>
```

```
//inside opened file

//to save changes: 
ctrl + O

//to close opened file
ctrl + x
```

[![alt_text](/assets/2023-03-09-how-to-add-ssh-key-for-passwordless-connection-in-ubuntu/image4.png "image_tooltip")](/assets/2023-03-09-how-to-add-ssh-key-for-passwordless-connection-in-ubuntu/image4.png "image_tooltip"){:target="_blank"}

## **On the client’s machine**

Go to your user directory

```
cd ~
```

Run the command to generate ssh public/private pair.

```
ssh-keygen
```

Go to ssh folder

```
cd ~/.ssh/
```

You should be able to see `id_rsa.pub` file.

```
ls
cat id_rsa.pub
```

It should have the following format `ssh-rsa <key> <hostname>`


[![alt_text](/assets/2023-03-09-how-to-add-ssh-key-for-passwordless-connection-in-ubuntu/image3.png "image_tooltip")](/assets/2023-03-09-how-to-add-ssh-key-for-passwordless-connection-in-ubuntu/image3.png "image_tooltip"){:target="_blank"}



<br>

## **On the server machine**


<br>

### **Optional: create ssh user**

Run and add some password

```
adduser admin
```


[![alt_text](/assets/2023-03-09-how-to-add-ssh-key-for-passwordless-connection-in-ubuntu/image2.png "image_tooltip")](/assets/2023-03-09-how-to-add-ssh-key-for-passwordless-connection-in-ubuntu/image2.png "image_tooltip"){:target="_blank"}


Run

```
usermod -aG sudo admin
```


<br>

### **Configure ssh for the server**

Instead of `/home/admin` you can use whatever user you have created.
In this article I going to assume you have user called `admin`.

```
cd /home/admin
mkdir .ssh
cd .ssh
touch authorized_keys
```


<br>

## **Put it together**

Let’s say you have user called `admin`. And the .ssh folder is located in `/home/admin` folder.

Copy the line from the  **Client’s** `~/.ssh/id_rsa.pub` and append this line to the **Server’s** `/home/admin/.ssh/authorized_keys`

[![alt_text](/assets/2023-03-09-how-to-add-ssh-key-for-passwordless-connection-in-ubuntu/image1.png "image_tooltip")](/assets/2023-03-09-how-to-add-ssh-key-for-passwordless-connection-in-ubuntu/image1.png "image_tooltip"){:target="_blank"}


The line you are going to append is in  `ssh-rsa <key> <hostname>` format. Append it from new line if you already have ssh keys in `authorized_keys` file.

Run

```
sudo service ssh restart
```

to restrict password ssh authentication uncomment and set this in  `/etc/ssh/sshd_config`

```
PasswordAuthentication no
```

Reload ssh

```
sudo service ssh restart
```

Then from Client you can connect to Server using `ssh admin@<your-ip>`
