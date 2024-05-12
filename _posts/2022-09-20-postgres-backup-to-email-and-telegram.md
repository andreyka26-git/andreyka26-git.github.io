---
layout: post
title: "Regular postgres backup to email and telegram channel"
date: 2022-09-20 10:05:35 -0000
category: ["Infrastructure"]
tags: [guides, infrastructure, tutorials]
description: "In this article we will do regular and recurring backup of PostgreSQL to telegram and email for ubuntu server using curl + cron."
thumbnail: /assets/2022-09-20-postgres-backup-to-email-and-telegram/logo.png
thumbnailwide: /assets/2022-09-20-postgres-backup-to-email-and-telegram/logo-wide.png
---

* TOC
{:toc}

<!-- Output copied to clipboard! -->

<!-----

You have some errors, warnings, or alerts. If you are using reckless mode, turn it off to see inline alerts.
* ERRORs: 0
* WARNINGs: 0
* ALERTS: 6

Conversion time: 2.238 seconds.


Using this Markdown file:

1. Paste this output into your source file.
2. See the notes and action items below regarding this conversion run.
3. Check the rendered output (headings, lists, code blocks, tables) for proper
   formatting and use a linkchecker before you publish this page.

Conversion notes:

* Docs to Markdown version 1.0β33
* Wed Sep 21 2022 08:54:27 GMT-0700 (PDT)
* Source doc: Regular postgres backup to email and telegram channel
* This document has images: check for >>>>>  gd2md-html alert:  inline image link in generated source and store images to your server. NOTE: Images in exported zip file from Google Docs may not appear in  the same order as they do in your doc. Please check the images!

----->

## **Why you may want to read this article**

This article is a guide on how to send backup (essentially you can send anything) to telegram and email with the minimum effort and external tools installed (`cURL`).

All applications that store data in some way. 

This implies that we don’t want to lose our data for sure, especially in production environments. To prevent data loss there are a lot of techniques, including: replication, backup, snapshots, etc.

In this case, we will consider a cheap ubuntu server (in my case I’m paying 5$), where we will set up our regular backup mechanism. But you also can do it on your own machine.

`My specific use case`: _I had an ubuntu server running `PostgreSQL`. I needed regular backups to be sent to my `email` and to the `telegram` channel from the ubuntu server_.

If you would like to see how to set up your Postgres database with command lines - check this [guide](https://andreyka26.com/postgres-with-docker-local-development).

<br>

## **Steps**

<br>

The guide itself is pretty simple we will use the `curl` tool in ubuntu, because all basic servers have it and you do not need to install anything additional

<br>

### **Create Gmail account**

Just follow the Gmail instructions, we will name email created `{created-email}`.

Then we need to turn on App Passwords to use them through curl. 

Go [here](https://support.google.com/accounts/answer/185833?hl=en)

1.Go to `Google Account` -> `Security` -> `Signing in to Google` -> `2-Step Verification`, enable it.

[![alt_text](/assets/2022-09-20-postgres-backup-to-email-and-telegram/image4.png "image_tooltip")](/assets/2022-09-20-postgres-backup-to-email-and-telegram/image4.png "image_tooltip"){:target="_blank"}

2.Go to `Google Account` -> `Security` -> `Signing in to Google` -> `App Passwords`

[![alt_text](/assets/2022-09-20-postgres-backup-to-email-and-telegram/image2.png "image_tooltip")](/assets/2022-09-20-postgres-backup-to-email-and-telegram/image2.png "image_tooltip"){:target="_blank"}

Copy generated password (we will name it `{gmail-password}`):

“aaaaaaaaaaaa”

[![alt_text](/assets/2022-09-20-postgres-backup-to-email-and-telegram/image1.png "image_tooltip")](/assets/2022-09-20-postgres-backup-to-email-and-telegram/image1.png "image_tooltip"){:target="_blank"}

<br>

### **Create telegram bot**

Follow this [instruction](https://core.telegram.org/bots#3-how-do-i-create-a-bot)

You should get the bot token in format (numbers + numbers with letters), we will name it `{bot-token}` in the article:

`1111111111:AAAAAAAA1aaaAAAAaAaaAaAAa1AAAAAAaA1`

After this create new group and get the id of this group.

While creating the group add your bot by the name you gave him while creating.

Now paste [https://api.telegram.org/bot`{bot-token}`/getUpdates](https://api.telegram.org/bot{bot-token}/getUpdates) in your browser. If it returns an empty response, try to remove and add your bot to the group again, as explained [here](https://stackoverflow.com/questions/32423837/telegram-bot-how-to-get-a-group-chat-id)

Then extract the chat id from JSON, I’ll name this `{chat-id}` in the article.

<br>

### **Write the script with file name `test.sh`**

```

#!/bin/sh

TELEGRAM_URL="https://api.telegram.org/bot<bot-token>/sendDocument"

CHAT_ID="<chat-id>"

docker exec<postgres-container> pg_dump <database-name> > dump.sql

echo "created dev backup file in container"

curl -v -F "chat_id=${CHAT_ID}" -F document=@./dump.sql $TELEGRAM_URL

echo "sent dev backup to telegram chat"

curl --url 'smtps://smtp.gmail.com:465' --ssl-reqd --mail-from '<created-email>' --mail-rcpt '<email-where-to-send>’' -F text='Backup' -F attachment=@dump.sql --user '<created-email>:<gmail-password>'

echo "sent dev backup to email"

```

<br>

### **Test Script**

To test your script just we will give the file permission to execute and then execute it.

```

chmod u+x test.sh

./test.sh

```

We will see the logs:

[![alt_text](/assets/2022-09-20-postgres-backup-to-email-and-telegram/image5.png "image_tooltip")](/assets/2022-09-20-postgres-backup-to-email-and-telegram/image5.png "image_tooltip"){:target="_blank"}

Telegram result:

[![alt_text](/assets/2022-09-20-postgres-backup-to-email-and-telegram/image6.png "image_tooltip")](/assets/2022-09-20-postgres-backup-to-email-and-telegram/image6.png "image_tooltip"){:target="_blank"}

Gmail result:

[![alt_text](/assets/2022-09-20-postgres-backup-to-email-and-telegram/image3.png "image_tooltip")](/assets/2022-09-20-postgres-backup-to-email-and-telegram/image3.png "image_tooltip"){:target="_blank"}

<br>

## **Automate backup process**

For automation we can use well known crontab for ubuntu.

```

crontab -e

```

You can find plenty of documentation for this, my file contains the following content:

```

0 1 \* \* \* /services/backup/prod-db-backup.sh

```

It means run this script once a day.

“`/services/backup/prod-db-backup.sh`” is a path to my script that contains same content as our test.sh.

<br>

### **Restore from backup (Optional)**

First copy dump.sql to the postgres docker container

```

docker cp dump.sql <container-name>:/dump.sql

```

Then run this command agains your database:

```

docker exec -it <container-name> bash

psql -h 127.0.0.1 -U root -d <database-name> < dump.sql

```
## **Follow up**

Please subscribe to my social media to not miss updates.: [Instagram](https://www.instagram.com/andreyka26_se), [Telegram](https://t.me/programming_space)

I’m talking about life as a Software Engineer at Microsoft.

<br>

Besides that, my projects:

Symptoms Diary: [https://symptom-diary.com](https://symptom-diary.com)

Pet4Pet: [https://pet-4-pet.com](https://pet-4-pet.com)