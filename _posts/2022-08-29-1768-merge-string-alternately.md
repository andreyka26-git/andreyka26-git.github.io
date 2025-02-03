---
layout: post
title: "1768. Merge Strings Alternately"
date: 2022-08-29 11:02:35 -0000
category: ["Leetcode"]
tags: [leetcode, array_string]
description: "I'm a Software Engineer at Microsoft. In this article, we will review, solve, and analyze LeetCode questions. Today, we are tackling an easy problem called '1768. Merge Strings Alternately'. We will solve it using different approaches: brute force and an optimized solution, and then analyze their time and space complexity."
thumbnail: /assets/2022-08-29-1768-merge-string-alternately/logo.png
thumbnailwide: /assets/2022-08-29-1768-merge-string-alternately/logo-wide.png
---

* TOC
{:toc}


<br>

## **Why you may want to read this note**

As a Software Engineer at Microsoft I didn’t do LeetCode interview questions for a long time already. Now I’m refreshing my skills in algorithm questions and these set of articles are for myself in future and for whoever is solving it right now. 
 
We are going to discuss the thinking process, insights, worse/better approaches, complexity analysis 


This is our list: [https://leetcode.com/studyplan/leetcode-75/](https://leetcode.com/studyplan/leetcode-75/)

The problem:  [1768. Merge Strings Alternately](https://leetcode.com/problems/merge-strings-alternately/?envType=study-plan-v2&envId=leetcode-75) 



<br>

## **Problem**


[![alt_text](/assets/2022-08-29-1768-merge-string-alternately/image1.png "image_tooltip")](/assets/2022-08-29-1768-merge-string-alternately/image1.png "image_tooltip"){:target="_blank"}




<br>

## **Solution O(max(m+n)) & O(m+n)**

One of the easiest problems. We can see that we are doing something like card shuffling: for each index (character position) we are taking 1 character from word1 and 1 character from word2.

Since `word1` can be longer than `word2` - we should ensure we don’t access non-existing indexes on the shorter word.
 
Usually strings are immutable in languages, meaning concatenating a single character to the string will create a new string, which is very bad in terms of performance. That’s why you should use StringBuilder. For JS I will be using an array of chars and then joining to a single string as it does not have String Builder

```js
var mergeAlternately = function(word1, word2) {
    let maxLen = Math.max(word1.length, word2.length)
    let res = new Array(maxLen)

    for (let i = 0; i < maxLen; i++) {
        if (i < word1.length) {
            res.push(word1[i])
        }

        if (i < word2.length) {
            res.push(word2[i])
        }
    }

    return res.join('')
};
```

**Runtime Complexity**: O(max(m+n)), where m is word1’s length and n is word2’s length, since we are iterating over largest of them

**Space Complexity**: O(m+n), since the resulting array will have a sum of lengths.
