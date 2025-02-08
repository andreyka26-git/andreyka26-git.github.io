---
layout: post
title: "334. Increasing Triplet Subsequence"
date: 2025-02-07 11:02:35 -0000
category: ["Leetcode"]
tags: [leetcode, array_string]
description: "I'm a Software Engineer at Microsoft. In this article, we will review, solve, and analyze LeetCode questions. Today, we are tackling an medium problem called '334. Increasing Triplet Subsequence'. We will solve it with brute force O(n^3) and O(1), then with optimized O(n) and O(n) solution. As a bonus we are going to solve it with O(n) and O(1) complexity."
thumbnail: /assets/2025-02-08-334-increasing-triplet-subsequence/logo.png
thumbnailwide: /assets/2025-02-08-334-increasing-triplet-subsequence/logo-wide.png
---

* TOC
{:toc}




<br>

## **Why you may want to read this note**

As a Software Engineer at Microsoft I didn’t do LeetCode interview questions for a long time already. Now I’m refreshing my skills in algorithm questions and these set of articles are for myself in future and for whoever is solving it right now. 
 
We are going to discuss the thinking process, insights, worse/better approaches, complexity analysis 


This is our list: [https://leetcode.com/studyplan/leetcode-75/](https://leetcode.com/studyplan/leetcode-75/)

The problem: [334. Increasing Triplet Subsequence](https://leetcode.com/problems/increasing-triplet-subsequence/description/?envType=study-plan-v2&envId=leetcode-75 )



<br>

## **Problem**


[![alt_text](/assets/2025-02-08-334-increasing-triplet-subsequence/image1.png "image_tooltip")](/assets/2025-02-08-334-increasing-triplet-subsequence/image1.png "image_tooltip"){:target="_blank"}


Given an integer array `nums`, return true if there exists a triple of indices `(i, j, k)` such that `i < j < k` and `nums[i] < nums[j] < nums[k]`. If no such indices exists, return false.



<br>

## **Solution1 O(n^3) O(1)**

The naive solution would be to try every possible combination of indexes maintaining` i < j < k`, and whenever we find `nums[i] < nums[j] < nums[k]` - we return true

```js
var increasingTriplet = function(nums) {
    for (let i = 0; i < nums.length - 2; i++) {
        for (let j = i + 1; j < nums.length - 1; j++) {
            for (let k = j + 1; k < nums.length; k++) {
                if (nums[i] < nums[j] && nums[j] < nums[k]) {
                    return true
                }
            }
        }
    }


    return false
};
```

This is O(n^3) solution which in the middle problem would give us Timeout.


[![alt_text](/assets/2025-02-08-334-increasing-triplet-subsequence/image2.png "image_tooltip")](/assets/2025-02-08-334-increasing-triplet-subsequence/image2.png "image_tooltip"){:target="_blank"}


**Runtime Complexity**: O(n^3) as we have 3 for loops

**Space Complexity**: O(1) as no extra space is used



<br>

## **Solution2 O(n) & O(n)**

Based on the previous task, we can reduce it to O(n^2) by having a stored suffix array of the maximum number so far (eliminating need to find k with iteration).

In this case first we would accumulate a suffix array, that will answer the question of what is the biggest number starting from the end of the array up to the current index for constant time. This will bring us O(n^2) which is still not good enough.

We can eliminate one more “power of” by doing the same with the prefix: for each specific index we can maintain the min number from the start of the array up to current index (eliminating finding i with iteration).

```js
var increasingTriplet = function(nums) {
    let suffix = new Array(nums.length)
    suffix[nums.length - 1] = nums[nums.length - 1]

    for (let i = nums.length - 2; i >= 0; i--) {
        suffix[i] = Math.max(suffix[i + 1], nums[i])
    }

    let prefix = new Array(nums.length)
    prefix[0] = nums[0]
    for (let i = 1; i < nums.length; i++) {
        prefix[i] = Math.min(prefix[i - 1], nums[i])
    }

    for (let j = 1; j < nums.length - 1; j++) {
        if (prefix[j - 1] < nums[j] && nums[j] < suffix[j + 1]) {
            return true
        }
    }

    return false
};
```

**Runtime Complexity**: O(3n) => O(n) as only 3 iterations

**Space Complexity**: O(2n) as there are 2 arrays: prefix and suffix



<br>

## **Solution3 O(n) & O(1)**

This is the solution I couldn’t come up with myself as for me it was counter intuitive. Basically we are maintaining 2 numbers: `firstSmall` and `secondSmall`. `FirstSmall` must be smaller than `secondSmall`. By going through the array, we greedily try to make `firstSmall` and `secondSmall` smaller, by giving higher change the third number to be bigger.

The counter intuitive part for me is that `firstSmall` can be at some point further on the array line than `secondSmall`, and the task implies to have the order of these 3 numbers. But actually it is okay, if we think more about it. Let’s say we have: `[2,1,5,0,4,6]`, the algo will perform these stages:

```
Arr: [2, 1, 5, 0, 6, 4]
Ind: [f, 1, 2, 3, 4, 5]

Arr: [2, 1, 5, 0, 6, 4]
Ind: [0, f, 2, 3, 4, 5]

Arr: [2, 1, 5, 0, 6, 4]
Ind: [0, f, s, 3, 4, 5]

Arr: [2, 1,  5, 0, 6, 4]
Ind: [0, f', s, f, t, 5]
```

At this point we will return true by having `secondIndex < firstIndex < thirdIndex` which is `0(3d index) < 5(2nd index) <  6(4th index)`, and it does not makes sense as `secondIndex` is less than `firstIndex`, but, please pay attention on the `f’`. This would be our previous first index, that is equal to 1. And it would work as well: `[1,5,6]` is increasing subsequence. 
 
The key point here, that whether we moved the first index or not, it does not matter, as we know that previously we maintained first and second indexes and values correctly, so we are operating over the 3d number based on the second number and index, which remain correct.

```js
var increasingTriplet = function(nums) {
    let firstSmall = Infinity;
    let secondSmall = Infinity;


    for (let i = 0; i < nums.length; i++) {
        if (nums[i] <= firstSmall) {
            firstSmall = nums[i];
        } else if (nums[i] <= secondSmall) {
            secondSmall = nums[i];
        } else {
            return true;
        }
    }


    return false;
};
```

**Runtime Complexity**: O(n) as only 1 iteration

**Space Complexity**: O(1) as no extra space is used
