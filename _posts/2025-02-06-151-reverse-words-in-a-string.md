---
layout: post
title: "151. Reverse Words in a String"
date: 2023-09-06 11:02:35 -0000
category: ["Leetcode"]
tags: [leetcode, array_string]
description: "I'm a Software Engineer at Microsoft. In this article, we will review, solve, and analyze LeetCode questions. Today, we are tackling an medium problem called '151. Reverse Words in a String'. We will solve it with brute force O(n) and O(n), then with optimized O(n) and O(1). We will also analyze their time and space complexity."
thumbnail: /assets/2025-02-06-151-reverse-words-in-a-string/logo.png
thumbnailwide: /assets/2025-02-06-151-reverse-words-in-a-string/logo-wide.png
---

* TOC
{:toc}



<br>

## **Why you may want to read this note**

As a Software Engineer at Microsoft I didn’t do LeetCode interview questions for a long time already. Now I’m refreshing my skills in algorithm questions and these set of articles are for myself in future and for whoever is solving it right now. 
 
We are going to discuss the thinking process, insights, worse/better approaches, complexity analysis 


Questions list: [https://leetcode.com/studyplan/leetcode-75/](https://leetcode.com/studyplan/leetcode-75/)

The problem:  [151. Reverse Words in a String](https://leetcode.com/problems/reverse-words-in-a-string/?envType=study-plan-v2&envId=leetcode-75 )



<br>

## **Problem**


[![alt_text](/assets/2025-02-06-151-reverse-words-in-a-string/image1.png "image_tooltip")](/assets/2025-02-06-151-reverse-words-in-a-string/image1.png "image_tooltip"){:target="_blank"}


Given an input string `s`, reverse the order of the words.

A word is defined as a sequence of non-space characters. The words in `s` will be separated by at least one space.

Return a string of the words in reverse order concatenated by a single space.

Note that `s` may contain leading or trailing spaces or multiple spaces between two words. The returned string should only have a single space separating the words. Do not include any extra spaces.



<br>

## **Solution1 O(n) & O(n)**

The naive solution is just to accumulate an array with words in order. And then reverse this array for output by adding space between them.

In the while iteration - we are shifting index until we reach non spacing character (this is the start of the word), then we are shifting it again until reaching spacing character (this is the end of the word). This way we got the single word and added it to the array. We continue doing it until we traverse all the string

In the end we traverse words array in the opposite direction fulfilling ordering requirement in the problem

```js
function reverseWords(s) {
    let ind = 0;
    let words = []

    while (ind < s.length) {
        while (ind < s.length && s[ind] === ' ') {
            ind++
        }

        if (ind === s.length) {
            break
        }

        let word = []

        while(ind < s.length && s[ind] !== ' ') {
            word.push(s[ind++])
        }


        words.push(word.join(''))
    }

    let result = []
    for (let i = words.length - 1; i >=0; i--) {
        result.push(words[i])
    }

    return result.join(' ')
}
```

**Runtime Complexity**: O(2n) => O(n) as we iterate for the 1 time through the whole string, and then 1 for loop to make the response. I’m omitting converting string to char’s array here.

**Space Complexity**: O(2n) => O(n), as we accumulate an array of words and then a response array.



<br>

## **Solution2 O(n) & O(1)**

I’ll be honest with you, I didn’t come up with an optimized solution on my own, I used hints.

Basically the thinking process should be the following:



* Let’s think about the order of the words, it should be reversed. Imagine this requirement is for a single word. Then easy peasy reverse algo that reverses the characters and that’s it. If we do it to a bunch of words in string - the order of the characters of the words will be broken, but the order of the words themselves will be correct
* When we have correct order of the words but incorrect order of characters in these words - we actually can reverse each word back in place

This is exactly what the optimized solution is about. Also 1 more optimization we are shifting the output to the beginning as we need to remove all unnecessary spaces.

The visual depiction of the algo is well represented here:


[![alt_text](/assets/2025-02-06-151-reverse-words-in-a-string/image2.png "image_tooltip")](/assets/2025-02-06-151-reverse-words-in-a-string/image2.png "image_tooltip"){:target="_blank"}


```js
function reverseWords(s) {
    let str = s.split('');
    let n = str.length

    reverseArray(0, n - 1)

    let left = 0
    let right = 0
    let i = 0

    while (i < n) {
        while (i < n && str[i] === ' ') {
            i++
        }

        if (i === n) {
            break;
        }

        while (i < n && str[i] !== ' ') {
            str[right++] = str[i++]
        }

        reverseArray(left, right - 1)
        str[right++] = ' '
        left = right
        i++
    }
    return str.slice(0, right - 1).join('')


    function reverseArray(start, end) {
        while (start < end) {
            let tmp = str[start]
            str[start++] = str[end]
            str[end--] = tmp
        }
    }
}
```

**Runtime Complexity**: O(3n) => O(n), we are reversing the whole string once, then iteration over it once, and reversing each word once.

**Space Complexity**: O(1), as we do everything in place. We don’t consider moving from string to chars array, as this is a limitation of JS that has immutable strings.
