---
layout: post
title: "605. Can Place Flowers"
date: 2025-02-04 11:02:35 -0000
category: ["Leetcode"]
tags: [leetcode, array_string]
description: "I'm a Software Engineer at Microsoft. In this article, we will review, solve, and analyze LeetCode questions. Today, we are tackling an easy problem called '605. Can Place Flowers'. We will solve it and then analyze their time and space complexity."
thumbnail: /assets/2025-02-04-605-can-place-flowers/logo.png
thumbnailwide: /assets/2025-02-04-605-can-place-flowers/logo-wide.png
---

* TOC
{:toc}


<br>

## **Why you may want to read this note**

As a Software Engineer at Microsoft I didn’t do LeetCode interview questions for a long time already. Now I’m refreshing my skills in algorithm questions and these set of articles are for myself in future and for whoever is solving it right now. 
 
We are going to discuss the thinking process, insights, worse/better approaches, complexity analysis 


Questions list: [https://leetcode.com/studyplan/leetcode-75/](https://leetcode.com/studyplan/leetcode-75/)

The problem:  [605. Can Place Flowers](https://leetcode.com/problems/can-place-flowers/?envType=study-plan-v2&envId=leetcode-75)



<br>

## **Problem**


[![alt_text](/assets/2025-02-04-605-can-place-flowers/image1.png "image_tooltip")](/assets/2025-02-04-605-can-place-flowers/image1.png "image_tooltip"){:target="_blank"}


 
You have a long flowerbed in which some of the plots are planted, and some are not. However, flowers cannot be planted in adjacent plots.

Given an integer array `flowerbed` containing `0`'s and `1`'s, where `0` means empty and `1` means not empty, and an integer `n`, return true if n new flowers can be planted in the `flowerbed` without violating the no-adjacent-flowers rule and false otherwise.



<br>

## **Solution O(m) & O(1)**

Naive approach is to try to count greedy (as close as possible) until we reach the end of the array. If possible places for flowers are higher than or equal to n - we return true.

To count properly we need to remember what we already counted before. We can do it using the additional set. But a better approach is to reuse the input array, and when we counted the spot - put the flower there.

```js
var canPlaceFlowers = function(flowerbed, n) {
    let num = 0

    for (let i = 0; i < flowerbed.length; i++) {
        let item = flowerbed[i]

        if (item === 1) {
            continue;
        }

        let canLeft = i - 1 < 0 || flowerbed[i - 1] === 0
        let canRight = i + 1 >= flowerbed.length || flowerbed[i + 1] === 0

        if (canLeft && canRight) {
            flowerbed[i] = 1
            num++
        }
    }

    return num >= n
};
```

**Runtime Complexity**: O(m), where m is the length of flowerbed, as we iterate over it once.

**Space Complexity**: O(1), as we are reusing input arrays without creating anything extra.
