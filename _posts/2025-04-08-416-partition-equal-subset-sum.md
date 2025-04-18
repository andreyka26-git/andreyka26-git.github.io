---
layout: post
title: "416. Partition Equal Subset Sum"
date: 2025-04-07 10:34:03 -0000
category: Leetcode
tags: [leetcode, dp]
description: "I'm a Software Engineer at Microsoft. In this article, we will review, solve, and analyze LeetCode questions. Today, we are tackling an medium problem called '416. Partition Equal Subset Sum'. We will solve it with multiple possible solutions starting from bruteforce, then following up with top down and bottom up dynamic programming solution, and then with knapsack solution"
thumbnail: /assets/2025-04-08-416-partition-equal-subset-sum/logo.png
thumbnailwide: /assets/2025-04-08-416-partition-equal-subset-sum/logo-wide.png
---

* TOC
{:toc}


<br>

## **Why you may want to read this note**

As a Software Engineer at Microsoft I didn’t do LeetCode interview questions for a long time already. Now I’m refreshing my skills in algorithm questions and these set of articles are for myself in future and for whoever is solving it right now. 
 
We are going to discuss the thinking process, insights, worse/better approaches, complexity analysis 


The list: [LeetCode-75](https://leetcode.com/studyplan/leetcode-75/) 

The problem: [416. Partition Equal Subset Sum](https://leetcode.com/problems/partition-equal-subset-sum/description/?envType=daily-question&envId=2025-04-07)


Today, we especially are focusing on the thinking process and how the one could come up with optimized dp solution from the bruteforce.

<br>

## **Problem**


[![alt_text](/assets/2025-04-08-416-partition-equal-subset-sum/image1.png "image_tooltip")](/assets/2025-04-08-416-partition-equal-subset-sum/image1.png "image_tooltip"){:target="_blank"}


Given an integer array nums, return true if you can partition the array into two subsets such that the sum of the elements in both subsets is equal or false otherwise.

 

Example 1:

Input: nums = [1,5,11,5]

Output: true

Explanation: The array can be partitioned as [1, 5, 5] and [11].

Example 2:

Input: nums = [1,2,3,5]

Output: false

Explanation: The array cannot be partitioned into equal sum subsets.


## How to approach this problem

I'm just a regular person, so I cannot come up with the optimized solution straight away. So I'm doing this approach:
- I'm solving with "any" bruteforce
- I'm make it up to fit the DP function (returns value, accepts parameters)
- Top down dp approach (just putting cache)
- Bottom up dp approach
- Possible optimization of dp space complexity

Let's do it 1 by 1.


<br>

## **Brute force 1 O(2^n) O(n)**

Initially we can do a brute force solution. We maintain 2 sums, and try to add the current index either to the first sum or to the second. If in the end we got sums equal to each other - we return true, otherwise - false.

```js
var canPartition = function(nums) {
    let len = nums.length

    let firstSum = 0
    let secondSum = 0

    let can = false

    trav(0)
    return can

    function trav(ind) {
        if (ind >= len) {
            if (firstSum === secondSum) {
                can = true
            }
            return;
        }

        firstSum += nums[ind]
        trav(ind + 1)
        firstSum -= nums[ind]

        secondSum += nums[ind]
        trav(ind + 1)
        secondSum -= nums[ind]
    }
};
```

**Runtime Complexity**: O(2^n) as we are spawning 2 more function calls per function

**Space Complexity**:  O(n) as we are doing n recursive calls at 1 time at most




<br>

## **Brute force 2 O(2^n) O(n)**

We could think about it in terms of math, and conclude that we don’t have to maintain 2 sums. We just need to find a subset that will be equal to sum / 2, since in the end we should be having 2 sums: `sum / 2 + sum / 2 = sum`.

```js
var canPartition = function(nums) {
    let len = nums.length
    let sum = 0

    let can = false

    let target = 0
    for (let i = 0; i < len; i++) {
        target += nums[i]
    }

    target = target / 2

    trav(0)
    return can

    function trav(ind) {
        if (ind >= len) {
            return;
        }


        if (sum === target) {
            can = true
            return;
        }

        sum += nums[ind]
        trav(ind + 1)
        sum -= nums[ind]

        trav(ind + 1)
    }
};
```

**Runtime Complexity**: O(2^n) as we are spawning 2 more function calls per function

**Space Complexity**:  O(n) as we are doing n recursive calls at 1 time at most



<br>

## **Brute force 3 O(2^n) O(n)**

We cannot change this problem to a Dynamic programming problem, as it maintains the state per decision tree. Instead, we should move it to parameters.

We now should ask ourselves a question, how can we split this problem into subproblems? Keep in mind in order to use caching - we should design a function that will return a solution to the given parameters.

In our case we can split it to the following subproblem: given index `ind`, and target sum `targetSum`  - can we find a subset that will be equal to `targetSum`?

```js
var canPartition = function(nums) {
    let len = nums.length


    let allSum = 0
    for (let i = 0; i < len; i++) {
        allSum += nums[i]
    }
    let targetSum = allSum / 2

    return sum(0, targetSum)


    function sum(ind, targetSum) {
        if (ind === len) {
            return false;
        }

        if (targetSum === 0) {
            return true
        }

        if (targetSum < 0) {
            return false
        }

        let withCurr = sum(ind + 1, targetSum - nums[ind])
        let withoutCurr = sum(ind + 1, targetSum)
        let can = withCurr || withoutCurr

        return can
    }
};
```

In terms of complexity it is exactly the same. But now we formed our recursive function to the state that can leverage caching, so DP.

**Runtime Complexity**: O(2^n) as we are spawning 2 more function calls per function

**Space Complexity**:  O(n) as we are doing n recursive calls at 1 time at most




<br>

## **Top Down DP O(n * target) O( n * target)**

Now let’s just add memoization to previous solution

```js
var canPartition = function(nums) {
    let len = nums.length
    let dp = new Array(len)


    let allSum = 0
    for (let i = 0; i < len; i++) {
        dp[i] = new Map()
        allSum += nums[i]
    }
    let targetSum = allSum / 2

    return sum(0, targetSum)


    function sum(ind, targetSum) {
        if (ind === len) {
            return false;
        }

        if (dp[ind].has(targetSum)) {
            return dp[ind].get(targetSum)
        }

        if (targetSum === 0) {
            return true
        }

        if (targetSum < 0) {
            return false
        }

        let withCurr = sum(ind + 1, targetSum - nums[ind])
        let withoutCurr = sum(ind + 1, targetSum)
        let can = withCurr || withoutCurr

        dp[ind].set(targetSum, can)
        return can
    }
};
```

**Runtime Complexity**: O(n * target) as we are trying every index, and we might have any value as target from 0 to target

**Space Complexity**:  O(n * target) as the size of cache




<br>

## **Bottom Up DP O(n * target) O(n * target)**

```js
var canPartition = function(nums) {
    let sum = nums.reduce((acc, num) => acc + num, 0);

    if (sum % 2 !== 0) {
        return false;
    }

    let target = sum / 2;
    let n = nums.length;

    // dp[i][j] = true if we can make sum j using elements from nums[0...i]
    let dp = new Array(n);
    for (let i = 0; i < n; i++) {
        dp[i] = new Array(target + 1).fill(false);
        dp[i][0] = true;
    }


    if (nums[0] <= target) {
        dp[0][nums[0]] = true;
    }

    for (let i = 1; i < n; i++) {
        for (let j = 1; j <= target; j++) {
            if (j < nums[i]) {
                dp[i][j] = dp[i-1][j];  // Can't include current element
            } else {
                dp[i][j] = dp[i-1][j] || dp[i-1][j - nums[i]];
            }
        }
    }


    return dp[n-1][target];
};
```

**Runtime Complexity**: O(n * target) as we are trying every index, and we might have any value as target from 0 to target

**Space Complexity**:  O(n * target) as the size of cache


<br>

## **Efficient Solution O(n *target) O(n *target)**

Another optimization would be to calculate all possible sums that we can get and put all of them into a set. Then just try to find the target in the set.

Besides that, we can improve performance by using math. If our sum is not divisible by 2 - then we return false straight away.

```js
var canPartition = function(nums) {
    let len = nums.length
    let target = 0

    for (let i = 0; i < len; i++) {
        target += nums[i]
    }


    if (target % 2 !== 0) {
        return false
    }

    target = target / 2    

    let set = new Set([0])

    for (let i = 0; i < len; i++) {
        let newSet = new Set(set)

        for (let value of set.values()) {
            let newVal = value + nums[i]

            if (newVal <= target) {
                newSet.add(newVal)
            }
        }

        set = newSet
    }

    return set.has(target)
};
```

**Runtime Complexity**: O(n * target) as we are trying every index, and we might have any value as target from 0 to target

**Space Complexity**:  O(n * target) as the size of cache


<br>

## **Knapsack DP O(target) O(target)**

There is a knapsack solution to this as well, as optimization to the solution above

So we are keeping our DP array, which means the following

If dp[i] == true  - then  sum `i` can be made in this subset.

If dp[i] == false - then we cannot make sum `i` out of this subset.

```js
var canPartition = function(nums) {
    let len = nums.length
    let target = 0

    for (let i = 0; i < len; i++) {
        target += nums[i]
    }


    if (target % 2 !== 0) {
        return false
    }

    target = target / 2

    let dp = new Array(target + 1).fill(false)
    dp[0] = true

    for (let i = 0; i < len; i++) {
        let curr = nums[i]

        for (let cand = target; cand >= curr; cand--) {
            dp[cand] = dp[cand] || dp[cand - curr]
        }
    }
    return dp[target]
};
```

Keep in mind that the order from target to `curr` is very important here, to omit duplicates: `let cand = target; cand >= curr; cand--`, for example, take a look at this one:

```
dp = [true, false, false, false, false, false, false]  // Initialize dp

nums = [3]
curr = 3

// Iterate from target to curr (backward)
for (let cand = 6; cand >= 3; cand--) {
    dp[cand] = dp[cand] || dp[cand - curr]


    // When cand = 6:
    // dp[6] = false || dp[3] = false || false = false


    // When cand = 5:
    // dp[5] = false || dp[2] = false || false = false


    // When cand = 4:
    // dp[4] = false || dp[1] = false || false = false


    // When cand = 3:
    // dp[3] = false || dp[0] = false || true = true
}
// Final dp = [true, false, false, true, false, false, false]
```

**Runtime Complexity**: O(n * target) as we are trying every index, and we might have any value as target from 0 to target

**Space Complexity**:  O(target) as the size of dp

## **Conclusion**

So that was it, usually this is how I sequentially approaching this kind of problems, as it was never the case I could jump to the most optimized solution straight away. Hope the thinking process and article itself was useful.

