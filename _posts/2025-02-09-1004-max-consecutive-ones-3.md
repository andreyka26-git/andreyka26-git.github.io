---
layout: post
title: "1004. Max Consecutive Ones III"
date: 2025-02-09 11:02:35 -0000
category: ["Leetcode"]
tags: [leetcode, array_string]
description: "I'm a Software Engineer at Microsoft. In this article, we will review, solve, and analyze LeetCode questions. Today, we are tackling an medium problem called '1004. Max Consecutive Ones III'. We will solve it with brute force solution O(n^2) & O(1) and sliding window solution O(n) & O(1)"
thumbnail: /assets/2025-02-09-1004-max-consecutive-ones-3/logo.png
thumbnailwide: /assets/2025-02-09-1004-max-consecutive-ones-3/logo-wide.png
---



<br>

## **Why you may want to read this note**

As a Software Engineer at Microsoft I didn’t do LeetCode interview questions for a long time already. Now I’m refreshing my skills in algorithm questions and these set of articles are for myself in future and for whoever is solving it right now. 
 
We are going to discuss the thinking process, insights, worse/better approaches, complexity analysis 


This is our list: [https://leetcode.com/studyplan/leetcode-75/](https://leetcode.com/studyplan/leetcode-75/)

The problem: [1004. Max Consecutive Ones III](https://leetcode.com/problems/max-consecutive-ones-iii/?envType=study-plan-v2&envId=leetcode-75)



<br>

## **Problem**


[![alt_text](/assets/2025-02-09-1004-max-consecutive-ones-3/image1.png "image_tooltip")](/assets/2025-02-09-1004-max-consecutive-ones-3/image1.png "image_tooltip"){:target="_blank"}


Given a binary array nums and an integer k, return the maximum number of consecutive 1's in the array if you can flip at most k 0's.



<br>

## **Brute force solution O(n^2) & O(1)**

From the problem explanation we can conclude that the number of `k` is the number of zeros we can skip and perceive them as 1s. 
The bruteforce is to try from all possible indices and try to get as many continuous ones as possible.

```js
var longestOnes = function(nums, k) {
    let max = 0

    for (let i = 0; i < nums.length - 1; i++) {
        let count = 0
        let localK = k
        for (let j = i; j < nums.length; j++) {
            if (nums[j] === 0 && localK === 0) {
                break;
            }

            if (nums[j] === 0) {
                localK--
            }

            count++
            max = Math.max(max, count)
        }
    }


    return max
};
```

It gives a Time Limit Exceeded result in Leetcode. We need an advanced solution.

**Runtime Complexity**: O(n^2) as we are iterating n * n times due to nested for loops

**Space Complexity**:  O(1) as we are using couple of variables



<br>

## **Sliding window solution O(n) & O(1)**

In this case our sliding window has dynamic length depending how many zeros and ones we encounter.

We start from the beginning and try to get as far as possible until we meet zero and we don’t have any `k` to flip this zero to `1`.

Then we are moving the start index (left) until we see ‘flipped’ zero which will increase our bank of ‘k’s (since before we spent our k to flip it to `1`). This way we have 1 more `k` to proceed moving our right index forward.

```js
var longestOnes = function(nums, k) {
    let count = 0
    let max = 0

    let left = 0;
    let right = 0;

    while (right < nums.length) {
        if (nums[right] === 0 && k === 0) {
            if (nums[left++] === 0) {
                k++
            }


            count--
            continue
        }

        if (nums[right++] === 0) {
            k--
        }


        count++
        max = Math.max(max, count)
    }
    return max
};
```

**Runtime Complexity**: O(2*n) => O(n), as we are traversing each index in the array maximum 2 times (with right index and then with left index)

**Space Complexity**: O(1), only local variables are used
