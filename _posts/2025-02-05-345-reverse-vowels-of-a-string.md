---
layout: post
title: "345. Reverse Vowels of a String"
date: 2025-02-05 11:02:35 -0000
category: ["Leetcode"]
tags: [leetcode, array_string]
description: "I'm a Software Engineer at Microsoft. In this article, we will review, solve, and analyze LeetCode questions. Today, we are tackling an easy problem called '345. Reverse Vowels of a String'. We will solve it and then analyze their time and space complexity."
thumbnail: /assets/2025-02-05-345-reverse-vowels-of-a-string/logo.png
thumbnailwide: /assets/2025-02-05-345-reverse-vowels-of-a-string/logo-wide.png
---

* TOC
{:toc}


<br>

## **Why you may want to read this note**

As a Software Engineer at Microsoft I didn’t do LeetCode interview questions for a long time already. Now I’m refreshing my skills in algorithm questions and these set of articles are for myself in future and for whoever is solving it right now. 
 
We are going to discuss the thinking process, insights, worse/better approaches, complexity analysis 


Questions list: [https://leetcode.com/studyplan/leetcode-75/](https://leetcode.com/studyplan/leetcode-75/)

The problem:  [345. Reverse Vowels of a String](https://leetcode.com/problems/reverse-vowels-of-a-string/?envType=study-plan-v2&envId=leetcode-75 )



<br>

## **Problem**


[![alt_text](/assets/2025-02-05-345-reverse-vowels-of-a-string/image1.png "image_tooltip")](/assets/2025-02-05-345-reverse-vowels-of-a-string/image1.png "image_tooltip"){:target="_blank"}


Given a string `s`, reverse only all the vowels in the string and return it.

The vowels are 'a', 'e', 'i', 'o', and 'u', and they can appear in both lower and upper cases, more than once.



<br>

## **Solution O(n) & O(n)**

First we need to decide which character is a vowel and which one isn’t. For this we are using a hashset with vowels, to be able to check character for O(1). 
 
The solution is to traverse the string once and save all vowels in order. Then traverse it again by replacing the current vowel with the vowel from the saved array in opposite order.

```js
var reverseVowels = function(s) {
    let vowels = new Set(['a', 'A', 'e', 'E', 'o', 'O', 'i', 'I', 'u', 'U'])

    let vowelsArr = [];


    for (let ch of s) {
        if (vowels.has(ch)) {
            vowelsArr.push(ch)
        }
    }

    let result = []
    let vowelsInd = vowelsArr.length - 1;
    for (let i = 0; i < s.length; i++) {
        let ch = s[i]

        if (vowels.has(ch)) {
            ch = vowelsArr[vowelsInd--]
        }

        result.push(ch)
    }

    return result.join('')
};
```


**Runtime Complexity**: O(2n) => O(n),  where n is length of string. We are traversing an array 2 times. We are omitting the complexity of converting string to array of characters.

**Space Complexity**: O(2n)=> O(n) as we are storing all vowels (which are in worst case all vowels) and the result array. The Hashset of vowels is constant. If the string wouldn’t be immutable we could do in place replacement and then 1 n from the complexity.
