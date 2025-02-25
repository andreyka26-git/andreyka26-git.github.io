---
layout: post
title: "1493. Longest Subarray of 1's After Deleting One Element"
date: 2025-02-09 11:02:35 -0000
category: ["Leetcode"]
tags: [leetcode, array_string]
description: "I'm a Software Engineer at Microsoft. In this article, we will review, solve, and analyze LeetCode questions. Today, we are tackling an medium problem called '1493. Longest Subarray of 1's After Deleting One Element'. We will solve it with brute force solution O(n^2) & O(1) and sliding window solution O(n) & O(1)"
thumbnail: /assets/2025-02-09-1493-longest-subarray-of-1s-after-deleting-one-element/logo.png
thumbnailwide: /assets/2025-02-09-1493-longest-subarray-of-1s-after-deleting-one-element/logo-wide.png
---

* TOC
{:toc}

<br>

## **Why you may want to read this note**

As a Software Engineer at Microsoft I didn’t do LeetCode interview questions for a long time already. Now I’m refreshing my skills in algorithm questions and these set of articles are for myself in future and for whoever is solving it right now. 
 
We are going to discuss the thinking process, insights, worse/better approaches, complexity analysis 


This is our list: [https://leetcode.com/studyplan/leetcode-75/](https://leetcode.com/studyplan/leetcode-75/)

The problem: [1493. Longest Subarray of 1's After Deleting One Element](https://leetcode.com/problems/longest-subarray-of-1s-after-deleting-one-element/description/?envType=study-plan-v2&envId=leetcode-75)



<br>

## **Problem**


[![alt_text](/assets/2025-02-09-1493-longest-subarray-of-1s-after-deleting-one-element/image1.png "image_tooltip")](/assets/2025-02-09-1493-longest-subarray-of-1s-after-deleting-one-element/image1.png "image_tooltip"){:target="_blank"}


Given a binary array nums, you should delete one element from it.

Return the size of the longest non-empty subarray containing only 1's in the resulting array. Return 0 if there is no such subarray.

Note: this is a specific case of the problem that we already solved called [1004. Max Consecutive Ones III](https://leetcode.com/problems/max-consecutive-ones-iii/description/?envType=study-plan-v2&envId=leetcode-75). In Max Consecutive Ones we can flip `k` zeros to ones, and need to return a max amount of consecutive ones.

In the current problem, we must **remove** only 1 element. For the arrays that have at least 1 zero - we can use flipping algo and return `max - 1` (since flipped zero is not one but removed element which we don’t count).

For the arrays that have all ones, we still should remove at least 1 element, so we again need to return `max - 1`. Let’s adjust previous algo for this



<br>

## **Brute force solution O(n^2) & O(1)**

Same as in the previous problem: trying to start from every possible index and accumulate as many as possible ones, having the ability to flip only 1 zero.

```js
var longestSubarray = function(nums) {
    if (nums.length === 1) {
        return 0
    }


    let max = 0
    let k = 1

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


    return max - 1
};
```

Strange, but it does not give Time Limit Exceeded in for this case.

**Runtime Complexity**: O(n^2) as we are iterating n * n times due to nested for loops

**Space Complexity**:  O(1) as we are using couple of variables



<br>

## **Sliding window solution O(n) & O(1)**

Count ones with a sliding window. When we encounter a second zero, move the left pointer until we restore the single `k` back to proceed moving the right index forward.

```js
var longestSubarray = function(nums) {
    let count = 0
    let max = 0
    let k = 1

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
    return max - 1
};
```

**Runtime Complexity**: O(2*n) => O(n), as we are traversing each index in the array maximum 2 times (with right index and then with left index)

**Space Complexity**: O(1), only local variables are used

