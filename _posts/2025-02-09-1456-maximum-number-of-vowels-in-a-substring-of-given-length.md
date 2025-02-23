---
layout: post
title: "1456. Maximum Number of Vowels in a Substring of Given Length"
date: 2025-02-09 11:02:35 -0000
category: ["Leetcode"]
tags: [leetcode, array_string]
description: "I'm a Software Engineer at Microsoft. In this article, we will review, solve, and analyze LeetCode questions. Today, we are tackling an medium problem called '1456. Maximum Number of Vowels in a Substring of Given Length'. We will solve it with sliding window solution O(n) & O(1)"
thumbnail: /assets/2025-02-09-1456-maximum-number-of-vowels-in-a-substring-of-given-length/logo.png
thumbnailwide: /assets/2025-02-09-1456-maximum-number-of-vowels-in-a-substring-of-given-length/logo-wide.png
---



<br>

## **Why you may want to read this note**

As a Software Engineer at Microsoft I didn’t do LeetCode interview questions for a long time already. Now I’m refreshing my skills in algorithm questions and these set of articles are for myself in future and for whoever is solving it right now. 
 
We are going to discuss the thinking process, insights, worse/better approaches, complexity analysis 


This is our list: [https://leetcode.com/studyplan/leetcode-75/](https://leetcode.com/studyplan/leetcode-75/)

The problem: [1456. Maximum Number of Vowels in a Substring of Given Length](https://leetcode.com/problems/maximum-number-of-vowels-in-a-substring-of-given-length/description/?envType=study-plan-v2&envId=leetcode-75)



<br>

## **Problem**


[![alt_text](/assets/2025-02-09-1456-maximum-number-of-vowels-in-a-substring-of-given-length/image1.png "image_tooltip")](/assets/2025-02-09-1456-maximum-number-of-vowels-in-a-substring-of-given-length/image1.png "image_tooltip"){:target="_blank"}


Given a string s and an integer k, return the maximum number of vowel letters in any substring of s with length k.

Vowel letters in English are 'a', 'e', 'i', 'o', and 'u'.



<br>

## **Sliding window solution O(n) & O(1)**

We are iterating over the string once, and increasing the counter every time we see a vowel. When we reach window (i - k … k) we should maintain the size of the window, so each time we are moving window 1 character forward, we remove 1 character from the behind.

```js
var maxVowels = function(s, k) {
    let set = new Set(['a', 'e', 'i', 'o', 'u'])
    let count = 0;
    let max = 0;

    for (let i = 0; i < s.length; i++) {
        if (set.has(s[i])) {
            count++
        }
        max = Math.max(max, count)

        let leftInd = (i + 1) - k
        if (leftInd >= 0 && set.has(s[leftInd])) {
            count--
        }
    }

    return max
};
```

**Runtime Complexity**: O(n) we are traversing the array only once. `set.has()` is O(1) since it is a hashset.

**Space Complexity**: O(1) as we are using 2 variables and set with a constant number of characters (5).
