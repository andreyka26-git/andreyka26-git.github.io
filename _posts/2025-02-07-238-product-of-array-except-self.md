---
layout: post
title: "238. Product of Array Except Self"
date: 2025-03-07 11:02:35 -0000
category: ["Leetcode"]
tags: [leetcode, array_string]
description: "I'm a Software Engineer at Microsoft. In this article, we will review, solve, and analyze LeetCode questions. Today, we are tackling an medium problem called '238. Product of Array Except Self'. We will solve it with brute force O(n^2) and O(n), then with optimized O(n) and O(n) solution. As a bonus we are going to solve it with O(n) and O(1) complexity."
thumbnail: /assets/2025-02-07-238-product-of-array-except-self/logo.png
thumbnailwide: /assets/2025-02-07-238-product-of-array-except-self/logo-wide.png
---

* TOC
{:toc}



<br>

## **Why you may want to read this note**

As a Software Engineer at Microsoft I didn’t do LeetCode interview questions for a long time already. Now I’m refreshing my skills in algorithm questions and these set of articles are for myself in future and for whoever is solving it right now. 
 
We are going to discuss the thinking process, insights, worse/better approaches, complexity analysis 


This is our list: [https://leetcode.com/studyplan/leetcode-75/](https://leetcode.com/studyplan/leetcode-75/)

The problem: [238. Product of Array Except Self](https://leetcode.com/problems/product-of-array-except-self/?envType=study-plan-v2&envId=leetcode-75 )



<br>

## **Problem**


[![alt_text](/assets/2025-02-07-238-product-of-array-except-self/image1.png "image_tooltip")](/assets/2025-02-07-238-product-of-array-except-self/image1.png "image_tooltip"){:target="_blank"}


Given an integer array `nums`, return an array `answer` such that `answer[i]` is equal to the product of all the elements of `nums` except `nums[i]`.

The product of any prefix or suffix of `nums` is guaranteed to fit in a 32-bit integer.

You must write an algorithm that runs in `O(n)` time and without using the division operation.



<br>

## **Solution1 O(n^2) & O(n)**

The naive approach is to go through all the items in the array, and calculate the product of all the numbers(j) except currently selected (i). 


However this is a medium problem and bruteforce will not pass, and you will hit the time limit.

```js
var productExceptSelf = function(nums) {
    let result = new Array(nums)

    for (let i = 0; i < nums.length; i++) {
        let product = 1

        for (let j = 0; j < nums.length; j++) {
            if (i === j) {
                continue
            }
            product *= nums[j]
        }

        result[i] = product
    }
    return result
};
```


[![alt_text](/assets/2025-02-07-238-product-of-array-except-self/image2.png "image_tooltip")](/assets/2025-02-07-238-product-of-array-except-self/image2.png "image_tooltip"){:target="_blank"}




<br>

## **Solution2 O(n) & O(n)**

More optimized solution can be figured out from the math nature of the product. Let’s say we have numbers `[x, y, m, n, p]`. Their product is `x * y * m * n * p`.

When we are on m number we actually want to do `x * y * n * p`. But math tells us that we can add parentheses on any place for product, so the previous expression can be put like this `(x * y) * (n * p)`.

This is exactly the hint. For each specific number we need to calculate numbers’ product before this number (prefix product) and numbers’ product after this number (suffix product).

Optimization relies on the fact that we can pre calculate all possible prefixes and all possible suffixes before and have them for O(1) time.

```js
var productExceptSelf = function(nums) {
    let prefixProduct = new Array(nums.length)
    prefixProduct[0] = nums[0]
    for (let i = 1; i < nums.length; i++) {
        prefixProduct[i] = prefixProduct[i - 1] * nums[i]
    }

    let suffixProduct = new Array(nums.length)
    suffixProduct[nums.length - 1] = nums[nums.length - 1]
    for (let i = nums.length - 2; i >= 0; i--) {
        suffixProduct[i] = suffixProduct[i + 1] * nums[i]
    }

    let res = new Array(nums.length)

    for (let i = 0; i < nums.length; i++) {
        let suffix = i < nums.length - 1 ? suffixProduct[i + 1] : 1
        let prefix = i > 0 ? prefixProduct[i - 1] : 1

        res[i] = prefix * suffix
    }
    return res
};
```

**Runtime Complexity**: O(2n) => O(n), as 2 iterations are used

**Space Complexity**: O(3n) => O(n), as we are creating new result array, prefix and suffix



<br>

## **Solution3 O(n) & O(1)**

Do we actually need to maintain all the prefix and suffix products? Is the prefix product at index 2 useful anyhow when we are at index 6? Whenever we go forward we need only the previous prefix.

Same happens with the suffix, but according to the rules we cannot do division. There is only 1 way to maintain a suffix without doing the division - start from the end of the array and go to the start.

The solution is about it.

We create the result array, and fill it with the prefixes in the way that a specific index has a prefix product not including itself. E.g. for [1,2,3,4] for number 3 (2nd index) it will contain 1*2 = 2 as a prefix.

This way whenever we are on index `i` - we straight away have a product calculated at this index. The remaining part is to start from the end and maintain the suffix sequentially while we are moving to index 0.

```js
var productExceptSelf = function(nums) {
    let res = new Array(nums.length).fill(1)

    for (let i = 1; i < nums.length; i++) {
        res[i] = res[i - 1] * nums[i - 1]
    }

    let suffix = 1

    for (let i = nums.length - 1; i >= 0; i--) {
        res[i] *= suffix
        suffix *= nums[i]
    }

    return res
};
```

**Runtime Complexity**: O(2n) => O(n) as 2 iterations are used

**Space Complexity**: O(n) => O(n) as we are creating new result array, or O(1) if we don’t count it



<br>

## **Bonus Solution4 O(n) & O(1)**

After solving with not optimized, and optimized algorithm, I was wondering how to do it using division operation that is forbidden in the problem's description?

The math tells us, that 

```
z = x * y

x = z / y
```

So we can make a product of all numbers, and then to know the product without the current number - we can divide it by this number.

We know that whenever we encounter zero - the product becomes zero. Also we know that we cannot divide by zero. 
 
What we will do is just skip zeros and count them.



* If there are no zeros - algorithm works just by dividing the current number every time.
* If there is only 1 zero, it means all products will be zero except the zero itself, because when the current number is zero, and it is single, it means the product will not be zeroed. In all other cases it will be as one of the numbers of the  product is zero.
* If there are more than 1 zero - all number will have 0 product, as for each single number there will be zero in product

```js
var productExceptSelf = function(nums) {
    let product = 1;
    let numOfZero = 0

    for (let i = 0; i < nums.length; i++) {
        if (nums[i] === 0) {
            numOfZero += 1
            continue
        }

        product *= nums[i]
    }

    var result = new Array(nums.length).fill(0)
    if (numOfZero > 1) {
        return result
    }

    for (let i = 0; i < nums.length; i++) {
        let res = 0;
        if (numOfZero === 1) {
            res = nums[i] === 0 ? product : 0
        }

        if (numOfZero === 0) {
            res = product / nums[i]
        }

        result[i] = res
    }

    return result
};
```

**Runtime Complexity**: O(2n) => O(n) as 2 iterations are used

**Space Complexity**: O(n) => O(n) as we are creating new result array, or O(1) if we don’t count it
