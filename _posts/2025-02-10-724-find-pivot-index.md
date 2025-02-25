---
layout: post
title: "724. Find Pivot Index"
date: 2025-02-09 11:02:35 -0000
category: ["Leetcode"]
tags: [leetcode, array_string]
description: "I'm a Software Engineer at Microsoft. In this article, we will review, solve, and analyze LeetCode questions. Today, we are tackling an medium problem called '724. Find Pivot Index'. We will solve it with brute force solution O(n^2) & O(1) and sliding window solution O(n) & O(n)"
thumbnail: /assets/2025-02-10-724-find-pivot-index/logo.png
thumbnailwide: /assets/2025-02-10-724-find-pivot-index/logo-wide.png
---


* TOC
{:toc}


<br>

## **Why you may want to read this note**

As a Software Engineer at Microsoft I didn’t do LeetCode interview questions for a long time already. Now I’m refreshing my skills in algorithm questions and these set of articles are for myself in future and for whoever is solving it right now. 
 
We are going to discuss the thinking process, insights, worse/better approaches, complexity analysis 


This is our list: [https://leetcode.com/studyplan/leetcode-75/](https://leetcode.com/studyplan/leetcode-75/)

The problem: [724. Find Pivot Index](https://leetcode.com/problems/find-pivot-index/submissions/1544315260/?envType=study-plan-v2&envId=leetcode-75)



<br>

## **Problem**


![alt_text](/assets/2025-02-10-724-find-pivot-index/image1.png "image_tooltip")


Given an array of integers nums, calculate the pivot index of this array.

The pivot index is the index where the sum of all the numbers strictly to the left of the index is equal to the sum of all the numbers strictly to the index's right.

If the index is on the left edge of the array, then the left sum is 0 because there are no elements to the left. This also applies to the right edge of the array.

Return the leftmost pivot index. If no such index exists, return -1.



<br>

## **Brute force solution O(n^2) & O(1)**

The naive approach is to try every possible index in the array, and for each of them calculate left and right sum. If we meet criterion `leftSum == rightSum` - we return that index.

```js
var pivotIndex = function(nums) {
    let index = -1

    for (let i = 0; i < nums.length; i++) {
        let leftSum = 0;
        let rightSum = 0;

        for (let j = 0; j < nums.length; j++) {
            if (i == j) {
                continue
            }

            if (j < i) {
                leftSum += nums[j]
            } else if (j > i) {
                rightSum += nums[j]
            }
        }

        if (leftSum === rightSum) {
            index = i
            break
        }
    }

    return index
};
```

**Runtime Complexity**: O(n^2) as we are iterating n * n times due to nested for loops

**Space Complexity**:  O(1) as we are using couple of variables



<br>

## **Prefix Suffix Sum solution O(n) & O(n)**

If we follow the brute force solution we can notice that we perform the same summations multiple times for the right sum (prefix)  and left sum (suffix).

For example: 
```

[0, 1, 2, 3, 4, 5, 6, 7]

Index = 4

Right sum = 0 + 1 + 2 + 3

Left sum = 5 + 6 + 7

Index = 5

Right sum = 0 + 1 + 2 + 3 + 4

Left sum = 6 + 7

…

```

We can see that for the right sum for a specific index we need the right sum for the previous index + previous element. Same logic applies for the left sum.

We can precalculate right sum and left sum for all indices, and then traverse array once having these sums ready for us.

```js
var pivotIndex = function(nums) {
    let len = nums.length

    let prefix = new Array(len)
    prefix[0] = nums[0]
    for (let i = 1; i < len; i++) {
        prefix[i] = prefix[i - 1] + nums[i]
    }

    let suffix = new Array(len)
    suffix[len - 1] = nums[len - 1]
    for (let i = len - 2; i >= 0; i--) {
        suffix[i] = suffix[i + 1] + nums[i]
    }

    for (let i = 0; i < len; i++) {
        let pref = 0
        let suf = 0;

        if (i > 0) {
            pref = prefix[i - 1]
        }


        if (i < len - 1) {
            suf = suffix[i + 1]
        }

        if (pref === suf) {
            return i
        }
    }

    return -1
};
```


**Runtime Complexity**: O(3n) => O(n), we iterate twice for prefix and suffix + traversing for the actual algo

**Space Complexity**:  O(2n) => O(n) as we are storing O(n) for prefix and O(n) for suffix


<br>

## **2 Variables solution O(n) & O(1)**

Can we do it in constant space? The answer is yes - we can. Instead of keeping prefix and suffix sums, we derive them on the fly by using variables.

First we are calculating total sum in 1 traversal.

Then we keep 2 variables: `currentSum` which is our "prefix" and `totalSum` which becomes our suffix, as we keep substracting numbers from it as we move forward.


```js
var pivotIndex = function(nums) {
    let totalSum = 0
    for (let num of nums) {
        totalSum += num
    }

    let currentSum = 0
    
    for (let i = 0; i < nums.length; i++) {
        totalSum -= nums[i]

        if (currentSum === totalSum) {
            return i
        }
        
        currentSum += nums[i]
    }
    return -1
};
```

**Runtime Complexity**: O(2n) => O(n), we iterate twice: first time to calculate total sum, and second to get the answer

**Space Complexity**:  O(1) => as we are using 2 extra variables

