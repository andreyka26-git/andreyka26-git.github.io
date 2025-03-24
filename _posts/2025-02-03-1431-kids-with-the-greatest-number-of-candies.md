---
layout: post
title: "1431. Kids With the Greatest Number of Candies"
date: 2025-01-04 11:02:35 -0000
category: ["Leetcode"]
tags: [leetcode, array_string]
description: "I'm a Software Engineer at Microsoft. In this article, we will review, solve, and analyze LeetCode questions. Today, we are tackling an easy problem called '1431. Kids With the Greatest Number of Candies'. We will solve it and then analyze their time and space complexity."
thumbnail: /assets/2025-02-03-1431-kids-with-the-greatest-number-of-candies/logo.png
thumbnailwide: /assets/2025-02-03-1431-kids-with-the-greatest-number-of-candies/logo-wide.png
---

* TOC
{:toc}


<br>

## **Why you may want to read this note**

As a Software Engineer at Microsoft I didn’t do LeetCode interview questions for a long time already. Now I’m refreshing my skills in algorithm questions and these set of articles are for myself in future and for whoever is solving it right now. 
 
We are going to discuss the thinking process, insights, worse/better approaches, complexity analysis 


Questions list: [https://leetcode.com/studyplan/leetcode-75/](https://leetcode.com/studyplan/leetcode-75/)

The problem:  [1431. Kids With the Greatest Number of Candies](https://leetcode.com/problems/kids-with-the-greatest-number-of-candies/submissions/1527468283/?envType=study-plan-v2&envId=leetcode-75)

<br>

## **Problem**


[![alt_text](/assets/2025-02-03-1431-kids-with-the-greatest-number-of-candies/image1.png "image_tooltip")](/assets/2025-02-03-1431-kids-with-the-greatest-number-of-candies/image1.png "image_tooltip"){:target="_blank"}

There are `n` kids with candies. You are given an integer array `candies`, where each `candies[i]` represents the number of candies the `ith` kid has, and an integer `extraCandies`, denoting the number of extra candies that you have.

Return a boolean array `result` of length `n`, where `result[i]` is true if, after giving the `ith` kid all the `extraCandies`, they will have the greatest number of candies among all the kids, or false otherwise.

Note that multiple kids can have the greatest number of candies.


 
 
## **Solution O(n) & O(1)**

Greatest number of candies among all the kids - it is basically the maximum number in the array. By giving each child extraCandies we might have a new maximum number in the array. So we will be giving the extra candies to each child at one time, and see if it is more than or equal to the current max candies number. 


With `[2,3,5,1,3]` the greatest number of candies, which is 5, has a child at 2nd index. So we will just iterate over them, and check whether extraCandies + currentCandies that child has are bigger than current max (greatest number of candies).

```js
var kidsWithCandies = function(candies, extraCandies) {
    let max = candies[0];
    for (let i = 0; i < candies.length; i++) {
        max = Math.max(max, candies[i])
    }

    let result = []

    for (let candie of candies) {
        result.push(candie + extraCandies >= max)
    }
    return result
};
```

**Runtime Complexity**: O(2n) => O(n) as we only iterate over the number of children.

**Space Complexity**: O(n) if we include output array, otherwise O(1)
