import "dotenv/config";

import database from "../config/db.js";
import ProblemModel from "../modules/problems/problem.model.js";

const seedProblems = [
  // ARRAYS - Easy (5 problems)
  {
    title: "Find the Maximum Element in an Array",
    description: "Given an array of integers, find and return the maximum element in the array.",
    difficulty: "Easy",
    tags: ["Array", "Basics"],
    testCases: [
      { input: "[1, 5, 3, 9, 2]", expectedOutput: "9", isHidden: false, explanation: "The maximum element is 9" },
      { input: "[10]", expectedOutput: "10", isHidden: false },
      { input: "[-5, -1, -10]", expectedOutput: "-1", isHidden: false },
    ],
    boilerplate: {
      javascript: "function findMax(arr) {\n  // Write your solution here\n}",
      python: "def find_max(arr):\n    pass",
      cpp: "int findMax(vector<int>& arr) {\n    return 0;\n}"
    },
    constraints: ["1 <= arr.length <= 10^5", "-10^9 <= arr[i] <= 10^9"],
  },
  {
    title: "Two Sum Problem",
    description: "Given an array of integers nums and an integer target, return the indices of the two numbers that add up to the target. You may assume each input has exactly one solution, and you cannot use the same element twice.",
    difficulty: "Easy",
    tags: ["Array", "HashMap", "Two Pointers"],
    testCases: [
      { input: "nums = [2,7,11,15], target = 9", expectedOutput: "[0,1]", isHidden: false, explanation: "nums[0] + nums[1] = 2 + 7 = 9" },
      { input: "nums = [3,2,4], target = 6", expectedOutput: "[1,2]", isHidden: false },
    ],
    boilerplate: {
      javascript: "function twoSum(nums, target) {\n  // Write your solution here\n}",
      python: "def two_sum(nums, target):\n    pass",
      cpp: "vector<int> twoSum(vector<int>& nums, int target) {\n    return {};\n}"
    },
    constraints: ["2 <= nums.length <= 10^4", "-10^9 <= nums[i] <= 10^9"],
  },
  {
    title: "Contains Duplicate",
    description: "Given an integer array nums, return true if any value appears at least twice in the array, and return false if every element is distinct.",
    difficulty: "Easy",
    tags: ["Array", "HashMap"],
    testCases: [
      { input: "[1,2,3,1]", expectedOutput: "true", isHidden: false },
      { input: "[1,2,3,4]", expectedOutput: "false", isHidden: false },
    ],
    boilerplate: {
      javascript: "function containsDuplicate(nums) {\n  // Write your solution here\n}",
      python: "def contains_duplicate(nums):\n    pass",
      cpp: "bool containsDuplicate(vector<int>& nums) {\n    return false;\n}"
    },
    constraints: ["1 <= nums.length <= 10^5"],
  },
  {
    title: "Best Time to Buy and Sell Stock",
    description: "Given an array prices where prices[i] is the price of a stock on day i, find the maximum profit you can achieve by buying and then selling. Return 0 if no profit can be made.",
    difficulty: "Easy",
    tags: ["Array", "Greedy"],
    testCases: [
      { input: "[7,1,5,3,6,4]", expectedOutput: "5", isHidden: false, explanation: "Buy at 1, sell at 6, profit = 5" },
      { input: "[7,6,4,3,1]", expectedOutput: "0", isHidden: false },
    ],
    boilerplate: {
      javascript: "function maxProfit(prices) {\n  // Write your solution here\n}",
      python: "def max_profit(prices):\n    pass",
      cpp: "int maxProfit(vector<int>& prices) {\n    return 0;\n}"
    },
    constraints: ["1 <= prices.length <= 10^5", "0 <= prices[i] <= 10^4"],
  },
  {
    title: "Valid Anagram",
    description: "Given two strings s and t, return true if t is an anagram of s, and false otherwise.",
    difficulty: "Easy",
    tags: ["String", "HashMap"],
    testCases: [
      { input: "s = 'anagram', t = 'nagaram'", expectedOutput: "true", isHidden: false },
      { input: "s = 'rat', t = 'car'", expectedOutput: "false", isHidden: false },
    ],
    boilerplate: {
      javascript: "function isAnagram(s, t) {\n  // Write your solution here\n}",
      python: "def is_anagram(s, t):\n    pass",
      cpp: "bool isAnagram(string s, string t) {\n    return false;\n}"
    },
    constraints: ["1 <= s.length, t.length <= 5 * 10^4"],
  },

  // ARRAYS - Medium (5 problems)
  {
    title: "Container With Most Water",
    description: "Given an integer array height of length n, find two lines that together with the x-axis form a container, such that the container contains the most water. Return the maximum area.",
    difficulty: "Medium",
    tags: ["Array", "Two Pointers"],
    testCases: [
      { input: "[1,8,6,2,5,4,8,3,7]", expectedOutput: "49", isHidden: false, explanation: "Width = 8, height = min(8,7) = 7, area = 49" },
      { input: "[1,1]", expectedOutput: "1", isHidden: false },
    ],
    boilerplate: {
      javascript: "function maxArea(height) {\n  // Write your solution here\n}",
      python: "def max_area(height):\n    pass",
      cpp: "int maxArea(vector<int>& height) {\n    return 0;\n}"
    },
    constraints: ["n == height.length", "2 <= n <= 10^5"],
  },
  {
    title: "Product of Array Except Self",
    description: "Given an integer array nums, return an array answer such that answer[i] is equal to the product of all elements except nums[i]. You must write an algorithm that runs in O(n) time and without using the division operation.",
    difficulty: "Medium",
    tags: ["Array"],
    testCases: [
      { input: "[1,2,3,4]", expectedOutput: "[24,12,8,6]", isHidden: false },
      { input: "[-1,1,0,-3,3]", expectedOutput: "[0,0,9,0,0]", isHidden: false },
    ],
    boilerplate: {
      javascript: "function productExceptSelf(nums) {\n  // Write your solution here\n}",
      python: "def product_except_self(nums):\n    pass",
      cpp: "vector<int> productExceptSelf(vector<int>& nums) {\n    return {};\n}"
    },
    constraints: ["2 <= nums.length <= 10^5", "-30 <= nums[i] <= 30"],
  },
  {
    title: "Longest Consecutive Sequence",
    description: "Given an unsorted array of integers nums, return the length of the longest consecutive elements sequence. You must write an algorithm that runs in O(n) time.",
    difficulty: "Medium",
    tags: ["Array", "HashMap"],
    testCases: [
      { input: "[100,4,200,1,3,2]", expectedOutput: "4", isHidden: false, explanation: "The longest sequence is [1,2,3,4]" },
      { input: "[0,3,7,2,5,8,4,6,0,1]", expectedOutput: "9", isHidden: false },
    ],
    boilerplate: {
      javascript: "function longestConsecutive(nums) {\n  // Write your solution here\n}",
      python: "def longest_consecutive(nums):\n    pass",
      cpp: "int longestConsecutive(vector<int>& nums) {\n    return 0;\n}"
    },
    constraints: ["0 <= nums.length <= 10^5", "0 <= nums[i] <= 10^9"],
  },
  {
    title: "3Sum",
    description: "Given an integer array nums of length n, return all unique triplets [nums[a], nums[b], nums[c]] such that i != j, i != k, and j != k, and nums[a] + nums[b] + nums[c] == 0.",
    difficulty: "Medium",
    tags: ["Array", "Two Pointers"],
    testCases: [
      { input: "[-1,0,1,2,-1,-4]", expectedOutput: "[[-1,-1,2],[-1,0,1]]", isHidden: false },
      { input: "[0]", expectedOutput: "[]", isHidden: false },
    ],
    boilerplate: {
      javascript: "function threeSum(nums) {\n  // Write your solution here\n}",
      python: "def three_sum(nums):\n    pass",
      cpp: "vector<vector<int>> threeSum(vector<int>& nums) {\n    return {};\n}"
    },
    constraints: ["3 <= nums.length <= 3000", "-10^5 <= nums[i] <= 10^5"],
  },
  {
    title: "Trapping Rain Water",
    description: "Given n non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.",
    difficulty: "Medium",
    tags: ["Array", "Two Pointers", "Stack"],
    testCases: [
      { input: "[0,1,0,2,1,0,1,3,2,1,2,1]", expectedOutput: "6", isHidden: false },
      { input: "[4,2,0,3,2,5]", expectedOutput: "9", isHidden: false },
    ],
    boilerplate: {
      javascript: "function trap(height) {\n  // Write your solution here\n}",
      python: "def trap(height):\n    pass",
      cpp: "int trap(vector<int>& height) {\n    return 0;\n}"
    },
    constraints: ["n == height.length", "1 <= n <= 2 * 10^4"],
  },

  // STRINGS - Easy (3 problems)
  {
    title: "Reverse a String",
    description: "Write a function that reverses a string. The input string is given as an array of characters s.",
    difficulty: "Easy",
    tags: ["String"],
    testCases: [
      { input: "['h','e','l','l','o']", expectedOutput: "['o','l','l','e','h']", isHidden: false },
      { input: "['H','a','n','n','a','h']", expectedOutput: "['h','a','n','n','a','H']", isHidden: false },
    ],
    boilerplate: {
      javascript: "function reverseString(s) {\n  // Write your solution here\n}",
      python: "def reverse_string(s):\n    pass",
      cpp: "void reverseString(vector<char>& s) {\n}\n"
    },
    constraints: ["1 <= s.length <= 10^5", "s[i] is a printable ascii character"],
  },
  {
    title: "Longest Substring Without Repeating Characters",
    description: "Given a string s, find the length of the longest substring without repeating characters.",
    difficulty: "Easy",
    tags: ["String", "Sliding Window"],
    testCases: [
      { input: "'abcabcbb'", expectedOutput: "3", isHidden: false, explanation: "The answer is 'abc'" },
      { input: "'bbbbb'", expectedOutput: "1", isHidden: false },
      { input: "'pwwkew'", expectedOutput: "3", isHidden: false },
    ],
    boilerplate: {
      javascript: "function lengthOfLongestSubstring(s) {\n  // Write your solution here\n}",
      python: "def length_of_longest_substring(s):\n    pass",
      cpp: "int lengthOfLongestSubstring(string s) {\n    return 0;\n}"
    },
    constraints: ["0 <= s.length <= 5 * 10^4", "s consists of English letters, digits, symbols and spaces"],
  },
  {
    title: "Palindrome Check",
    description: "Given a string s, determine if it is a palindrome, considering only alphanumeric characters and ignoring cases.",
    difficulty: "Easy",
    tags: ["String", "Two Pointers"],
    testCases: [
      { input: "'A man, a plan, a canal: Panama'", expectedOutput: "true", isHidden: false },
      { input: "'race a car'", expectedOutput: "false", isHidden: false },
    ],
    boilerplate: {
      javascript: "function isPalindrome(s) {\n  // Write your solution here\n}",
      python: "def is_palindrome(s):\n    pass",
      cpp: "bool isPalindrome(string s) {\n    return false;\n}"
    },
    constraints: ["1 <= s.length <= 2 * 10^5"],
  },

  // STRINGS - Medium (3 problems)
  {
    title: "Group Anagrams",
    description: "Given an array of strings strs, group the anagrams together. You can return the answer in any order.",
    difficulty: "Medium",
    tags: ["String", "HashMap"],
    testCases: [
      { input: "['eat','tea','tan','ate','nat','bat']", expectedOutput: "[['bat'],['nat','tan'],['ate','eat','tea']]", isHidden: false },
      { input: "['']", expectedOutput: "[['']]", isHidden: false },
    ],
    boilerplate: {
      javascript: "function groupAnagrams(strs) {\n  // Write your solution here\n}",
      python: "def group_anagrams(strs):\n    pass",
      cpp: "vector<vector<string>> groupAnagrams(vector<string>& strs) {\n    return {};\n}"
    },
    constraints: ["1 <= strs.length <= 10^4", "0 <= strs[i].length <= 100"],
  },
  {
    title: "Longest Palindromic Substring",
    description: "Given a string s, return the longest palindromic substring in s.",
    difficulty: "Medium",
    tags: ["String", "DP"],
    testCases: [
      { input: "'babad'", expectedOutput: "'bab' or 'aba'", isHidden: false },
      { input: "'cbbd'", expectedOutput: "'bb'", isHidden: false },
    ],
    boilerplate: {
      javascript: "function longestPalindrome(s) {\n  // Write your solution here\n}",
      python: "def longest_palindrome(s):\n    pass",
      cpp: "string longestPalindrome(string s) {\n    return '';\n}"
    },
    constraints: ["1 <= s.length <= 1000", "s consist of only digits and English letters"],
  },
  {
    title: "Regular Expression Matching",
    description: "Given an input string s and a pattern p, implement regular expression matching with support for '.' and '*'.",
    difficulty: "Medium",
    tags: ["String", "DP"],
    testCases: [
      { input: "s = 'aa', p = 'a'", expectedOutput: "false", isHidden: false },
      { input: "s = 'aa', p = '.*'", expectedOutput: "true", isHidden: false },
    ],
    boilerplate: {
      javascript: "function isMatch(s, p) {\n  // Write your solution here\n}",
      python: "def is_match(s, p):\n    pass",
      cpp: "bool isMatch(string s, string p) {\n    return false;\n}"
    },
    constraints: ["1 <= s.length <= 20", "1 <= p.length <= 30"],
  },

  // SORTING - Easy (3 problems)
  {
    title: "Merge Two Sorted Arrays",
    description: "Given two sorted integer arrays nums1 and nums2, merge nums2 into nums1 as one sorted array.",
    difficulty: "Easy",
    tags: ["Sorting", "Two Pointers"],
    testCases: [
      { input: "nums1 = [1,2,3,0,0,0], m = 3, nums2 = [2,5,6], n = 3", expectedOutput: "[1,2,2,3,5,6]", isHidden: false },
      { input: "nums1 = [1], m = 1, nums2 = [], n = 0", expectedOutput: "[1]", isHidden: false },
    ],
    boilerplate: {
      javascript: "function merge(nums1, m, nums2, n) {\n  // Write your solution here\n}",
      python: "def merge(nums1, m, nums2, n):\n    pass",
      cpp: "void merge(vector<int>& nums1, int m, vector<int>& nums2, int n) {\n}\n"
    },
    constraints: ["nums1.length == m + n", "nums2.length == n"],
  },
  {
    title: "Majority Element",
    description: "Given an array nums of size n, return the majority element. The majority element is the element that appears more than ⌊n / 2⌋ times.",
    difficulty: "Easy",
    tags: ["Sorting", "Array"],
    testCases: [
      { input: "[3,2,3]", expectedOutput: "3", isHidden: false },
      { input: "[2,2,1,1,1,2,2]", expectedOutput: "2", isHidden: false },
    ],
    boilerplate: {
      javascript: "function majorityElement(nums) {\n  // Write your solution here\n}",
      python: "def majority_element(nums):\n    pass",
      cpp: "int majorityElement(vector<int>& nums) {\n    return 0;\n}"
    },
    constraints: ["n == nums.length", "1 <= n <= 5 * 10^4"],
  },
  {
    title: "Valid Parentheses",
    description: "Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.",
    difficulty: "Easy",
    tags: ["Stack", "String"],
    testCases: [
      { input: "'()'", expectedOutput: "true", isHidden: false },
      { input: "'()[]{}'", expectedOutput: "true", isHidden: false },
      { input: "'(]'", expectedOutput: "false", isHidden: false },
    ],
    boilerplate: {
      javascript: "function isValid(s) {\n  // Write your solution here\n}",
      python: "def is_valid(s):\n    pass",
      cpp: "bool isValid(string s) {\n    return false;\n}"
    },
    constraints: ["1 <= s.length <= 10^4", "s consists of parentheses only"],
  },

  // DYNAMIC PROGRAMMING - Easy (3 problems)
  {
    title: "Climbing Stairs",
    description: "You are climbing a staircase. It takes n steps to reach the top. Each time you can climb 1 or 2 steps. In how many distinct ways can you climb to the top?",
    difficulty: "Easy",
    tags: ["DP", "Math"],
    testCases: [
      { input: "2", expectedOutput: "2", isHidden: false, explanation: "1. 1 step + 1 step\n2. 2 steps" },
      { input: "3", expectedOutput: "3", isHidden: false, explanation: "1. 1 step + 1 step + 1 step\n2. 1 step + 2 steps\n3. 2 steps + 1 step" },
    ],
    boilerplate: {
      javascript: "function climbStairs(n) {\n  // Write your solution here\n}",
      python: "def climb_stairs(n):\n    pass",
      cpp: "int climbStairs(int n) {\n    return 0;\n}"
    },
    constraints: ["1 <= n <= 45"],
  },
  {
    title: "House Robber",
    description: "You are a professional robber planning to rob houses along a street. Each house has a certain amount of money. You cannot rob two adjacent houses. Return the maximum amount you can rob.",
    difficulty: "Easy",
    tags: ["DP"],
    testCases: [
      { input: "[1,2,3,1]", expectedOutput: "4", isHidden: false, explanation: "Rob house 1 (1) and house 3 (3). Total = 1 + 3 = 4" },
      { input: "[2,7,9,3]", expectedOutput: "9", isHidden: false, explanation: "Rob house 2 (7) and house 4 (3). Total = 7 + 2 = 9" },
    ],
    boilerplate: {
      javascript: "function rob(nums) {\n  // Write your solution here\n}",
      python: "def rob(nums):\n    pass",
      cpp: "int rob(vector<int>& nums) {\n    return 0;\n}"
    },
    constraints: ["1 <= nums.length <= 100", "0 <= nums[i] <= 400"],
  },
  {
    title: "Min Cost Climbing Stairs",
    description: "You are given an integer array cost where cost[i] is the cost of ith step on a staircase. Once you pay the cost, you can climb one or two steps. You can start from either step 0 or step 1. Return the minimum cost to reach the top of the floor.",
    difficulty: "Easy",
    tags: ["DP"],
    testCases: [
      { input: "[10,15,20]", expectedOutput: "15", isHidden: false, explanation: "Start at index 1, pay 15, climb two steps to reach the top" },
      { input: "[1,100,1,1,1,100,1,1,100,1]", expectedOutput: "6", isHidden: false },
    ],
    boilerplate: {
      javascript: "function minCostClimbingStairs(cost) {\n  // Write your solution here\n}",
      python: "def min_cost_climbing_stairs(cost):\n    pass",
      cpp: "int minCostClimbingStairs(vector<int>& cost) {\n    return 0;\n}"
    },
    constraints: ["2 <= cost.length <= 1000", "0 <= cost[i] <= 999"],
  },

  // DYNAMIC PROGRAMMING - Medium (5 problems)
  {
    title: "Longest Increasing Subsequence",
    description: "Given an integer array nums, return the length of the longest strictly increasing subsequence.",
    difficulty: "Medium",
    tags: ["DP"],
    testCases: [
      { input: "[10,9,2,5,3,7,101,18]", expectedOutput: "4", isHidden: false, explanation: "The LIS is [2,3,7,101]" },
      { input: "[0,1,0,4,4,4,3,5,5]", expectedOutput: "4", isHidden: false },
    ],
    boilerplate: {
      javascript: "function lengthOfLIS(nums) {\n  // Write your solution here\n}",
      python: "def length_of_lis(nums):\n    pass",
      cpp: "int lengthOfLIS(vector<int>& nums) {\n    return 0;\n}"
    },
    constraints: ["1 <= nums.length <= 2500", "-10^4 <= nums[i] <= 10^4"],
  },
  {
    title: "Coin Change",
    description: "You are given an integer array coins representing coins of different denominations and an integer amount representing a total amount of money. Return the fewest number of coins that you need to make up that amount.",
    difficulty: "Medium",
    tags: ["DP", "BFS"],
    testCases: [
      { input: "coins = [1,2,5], amount = 5", expectedOutput: "1", isHidden: false, explanation: "5 = 5" },
      { input: "coins = [2], amount = 3", expectedOutput: "-1", isHidden: false },
    ],
    boilerplate: {
      javascript: "function coinChange(coins, amount) {\n  // Write your solution here\n}",
      python: "def coin_change(coins, amount):\n    pass",
      cpp: "int coinChange(vector<int>& coins, int amount) {\n    return 0;\n}"
    },
    constraints: ["1 <= coins.length <= 12", "1 <= coins[i] <= 2^31 - 1"],
  },
  {
    title: "Decode Ways",
    description: "A message containing letters from A-Z can be encoded into numbers using the mapping A→1, B→2, ..., Z→26. Given a string s containing only digits, return the number of ways to decode it.",
    difficulty: "Medium",
    tags: ["DP", "String"],
    testCases: [
      { input: "'12'", expectedOutput: "2", isHidden: false, explanation: "It could be decoded as 'AB' (1 2) or 'L' (12)" },
      { input: "'226'", expectedOutput: "3", isHidden: false, explanation: "'BZ' (2 26), 'VF' (22 6), or 'BBF' (2 2 6)" },
    ],
    boilerplate: {
      javascript: "function numDecodings(s) {\n  // Write your solution here\n}",
      python: "def num_decodings(s):\n    pass",
      cpp: "int numDecodings(string s) {\n    return 0;\n}"
    },
    constraints: ["1 <= s.length <= 100", "s contains only digits"],
  },
  {
    title: "Maximum Subarray",
    description: "Given an integer array nums, find the subarray with the largest sum, and return its sum.",
    difficulty: "Medium",
    tags: ["DP", "Array"],
    testCases: [
      { input: "[-2,1,-3,4,-1,2,1,-5,4]", expectedOutput: "6", isHidden: false, explanation: "[4,-1,2,1] has the largest sum = 6" },
      { input: "[1]", expectedOutput: "1", isHidden: false },
    ],
    boilerplate: {
      javascript: "function maxSubArray(nums) {\n  // Write your solution here\n}",
      python: "def max_sub_array(nums):\n    pass",
      cpp: "int maxSubArray(vector<int>& nums) {\n    return 0;\n}"
    },
    constraints: ["1 <= nums.length <= 10^5", "-10^4 <= nums[i] <= 10^4"],
  },
  {
    title: "Word Break",
    description: "Given a string s and a dictionary of strings wordDict, return true if s can be segmented into a space-separated sequence of dictionary words.",
    difficulty: "Medium",
    tags: ["DP", "String", "Trie"],
    testCases: [
      { input: "s = 'leetcode', wordDict = ['leet','code']", expectedOutput: "true", isHidden: false },
      { input: "s = 'applepenapple', wordDict = ['apple','pen']", expectedOutput: "true", isHidden: false },
    ],
    boilerplate: {
      javascript: "function wordBreak(s, wordDict) {\n  // Write your solution here\n}",
      python: "def word_break(s, word_dict):\n    pass",
      cpp: "bool wordBreak(string s, vector<string>& wordDict) {\n    return false;\n}"
    },
    constraints: ["1 <= s.length <= 300", "1 <= wordDict.length <= 1000"],
  },

  // BINARY SEARCH - Easy (2 problems)
  {
    title: "Binary Search",
    description: "Given a sorted array of integers nums and an integer target, return the index of target if it is in nums, or -1 if it is not in nums.",
    difficulty: "Easy",
    tags: ["Binary Search"],
    testCases: [
      { input: "nums = [-1,0,3,5,9,12], target = 9", expectedOutput: "4", isHidden: false },
      { input: "nums = [-1,0,3,5,9,12], target = 13", expectedOutput: "-1", isHidden: false },
    ],
    boilerplate: {
      javascript: "function search(nums, target) {\n  // Write your solution here\n}",
      python: "def search(nums, target):\n    pass",
      cpp: "int search(vector<int>& nums, int target) {\n    return 0;\n}"
    },
    constraints: ["1 <= nums.length <= 10^4", "-10^4 < nums[i], target < 10^4"],
  },
  {
    title: "First Bad Version",
    description: "You are given an API isBadVersion(version) which returns whether version is bad. Implement a function to find the first bad version.",
    difficulty: "Easy",
    tags: ["Binary Search"],
    testCases: [
      { input: "n = 5, bad = 4", expectedOutput: "4", isHidden: false },
      { input: "n = 1, bad = 1", expectedOutput: "1", isHidden: false },
    ],
    boilerplate: {
      javascript: "function firstBadVersion(n) {\n  // Write your solution here\n}",
      python: "def first_bad_version(n):\n    pass",
      cpp: "int firstBadVersion(int n) {\n    return 0;\n}"
    },
    constraints: ["1 <= bad <= n <= 2^31 - 1"],
  },

  // BINARY SEARCH - Medium (3 problems)
  {
    title: "Search in Rotated Sorted Array",
    description: "There is an integer array nums sorted in ascending order (with distinct values). Prior to being passed to your function, nums is possibly rotated at an unknown pivot index k. Given the rotated array and an integer target, return the index of target if it is in nums, or -1 if it is not in nums.",
    difficulty: "Medium",
    tags: ["Binary Search"],
    testCases: [
      { input: "nums = [4,5,6,7,0,1,2], target = 0", expectedOutput: "4", isHidden: false },
      { input: "nums = [4,5,6,7,0,1,2], target = 3", expectedOutput: "-1", isHidden: false },
    ],
    boilerplate: {
      javascript: "function search(nums, target) {\n  // Write your solution here\n}",
      python: "def search(nums, target):\n    pass",
      cpp: "int search(vector<int>& nums, int target) {\n    return 0;\n}"
    },
    constraints: ["1 <= nums.length <= 5000", "-10^4 <= nums[i] <= 10^4"],
  },
  {
    title: "Find Minimum in Rotated Sorted Array",
    description: "Suppose an array of length n sorted in ascending order is rotated between 1 and n times. Given the rotated array nums of length n, return the minimum element of this array.",
    difficulty: "Medium",
    tags: ["Binary Search"],
    testCases: [
      { input: "[3,4,5,1,2]", expectedOutput: "1", isHidden: false },
      { input: "[2,1]", expectedOutput: "1", isHidden: false },
    ],
    boilerplate: {
      javascript: "function findMin(nums) {\n  // Write your solution here\n}",
      python: "def find_min(nums):\n    pass",
      cpp: "int findMin(vector<int>& nums) {\n    return 0;\n}"
    },
    constraints: ["n == nums.length", "1 <= n <= 5000"],
  },
  {
    title: "Time Based Key-Value Store",
    description: "Design a time-based key-value data structure that supports setting values with timestamps and retrieving the value of a key at a certain timestamp.",
    difficulty: "Medium",
    tags: ["Binary Search", "HashMap"],
    testCases: [
      { input: "TimeMap.set('foo', 'bar', 1), TimeMap.get('foo', 1) = 'bar', TimeMap.get('foo', 3) = 'bar'", expectedOutput: "'bar', 'bar'", isHidden: false },
    ],
    boilerplate: {
      javascript: "class TimeMap {\n  constructor() {}\n  set(key, value, timestamp) {}\n  get(key, timestamp) {}\n}",
      python: "class TimeMap:\n    def __init__(self): pass\n    def set(self, key, value, timestamp): pass\n    def get(self, key, timestamp): pass",
      cpp: "class TimeMap {\npublic:\n    void set(string key, string value, int timestamp) {}\n    string get(string key, int timestamp) { return ''; }\n};"
    },
    constraints: ["1 <= key.length, value.length <= 100"],
  },

  // TREES - Easy (4 problems)
  {
    title: "Maximum Depth of Binary Tree",
    description: "Given the root of a binary tree, return its maximum depth. A binary tree's maximum depth is the number of nodes along the longest path from the root node down to the farthest leaf node.",
    difficulty: "Easy",
    tags: ["Tree", "DFS"],
    testCases: [
      { input: "[3,9,20,null,null,15,7]", expectedOutput: "3", isHidden: false },
      { input: "[1,null,2]", expectedOutput: "2", isHidden: false },
    ],
    boilerplate: {
      javascript: "function maxDepth(root) {\n  // Write your solution here\n}",
      python: "def max_depth(root):\n    pass",
      cpp: "int maxDepth(TreeNode* root) {\n    return 0;\n}"
    },
    constraints: ["The number of nodes in the tree is in the range [0, 10^4]"],
  },
  {
    title: "Invert Binary Tree",
    description: "Given the root of a binary tree, invert the tree, and return its root.",
    difficulty: "Easy",
    tags: ["Tree", "DFS"],
    testCases: [
      { input: "[4,2,7,1,3,6,9]", expectedOutput: "[4,7,2,9,6,3,1]", isHidden: false },
      { input: "[2,1,3]", expectedOutput: "[2,3,1]", isHidden: false },
    ],
    boilerplate: {
      javascript: "function invertTree(root) {\n  // Write your solution here\n}",
      python: "def invert_tree(root):\n    pass",
      cpp: "TreeNode* invertTree(TreeNode* root) {\n    return nullptr;\n}"
    },
    constraints: ["The number of nodes in the tree is in the range [0, 100]"],
  },
  {
    title: "Balanced Binary Tree",
    description: "Given a binary tree, determine if it is height-balanced.",
    difficulty: "Easy",
    tags: ["Tree", "DFS"],
    testCases: [
      { input: "[3,9,20,null,null,15,7]", expectedOutput: "true", isHidden: false },
      { input: "[1,2,2,3,3,null,null,4,4]", expectedOutput: "false", isHidden: false },
    ],
    boilerplate: {
      javascript: "function isBalanced(root) {\n  // Write your solution here\n}",
      python: "def is_balanced(root):\n    pass",
      cpp: "bool isBalanced(TreeNode* root) {\n    return false;\n}"
    },
    constraints: ["The number of nodes in the tree is in the range [0, 5000]"],
  },
  {
    title: "Diameter of Binary Tree",
    description: "Given the root of a binary tree, return the length of the diameter of the tree. The diameter of a binary tree is the length of the longest path between any two nodes in a tree.",
    difficulty: "Easy",
    tags: ["Tree", "DFS"],
    testCases: [
      { input: "[1,2,3,4,5]", expectedOutput: "3", isHidden: false, explanation: "The diameter is the path [4,2,1,3] or [5,2,1,3]" },
      { input: "[1,2]", expectedOutput: "1", isHidden: false },
    ],
    boilerplate: {
      javascript: "function diameterOfBinaryTree(root) {\n  // Write your solution here\n}",
      python: "def diameter_of_binary_tree(root):\n    pass",
      cpp: "int diameterOfBinaryTree(TreeNode* root) {\n    return 0;\n}"
    },
    constraints: ["The number of nodes in the tree is in the range [1, 10^4]"],
  },

  // TREES - Medium (4 problems)
  {
    title: "Lowest Common Ancestor of a Binary Tree",
    description: "Given a binary tree, find the lowest common ancestor (LCA) of two given nodes in the tree.",
    difficulty: "Medium",
    tags: ["Tree", "DFS"],
    testCases: [
      { input: "root = [3,5,1,6,2,0,8,null,null,7,4], p = 5, q = 1", expectedOutput: "3", isHidden: false },
      { input: "root = [3,5,1,6,2,0,8,null,null,7,4], p = 5, q = 4", expectedOutput: "5", isHidden: false },
    ],
    boilerplate: {
      javascript: "function lowestCommonAncestor(root, p, q) {\n  // Write your solution here\n}",
      python: "def lowest_common_ancestor(root, p, q):\n    pass",
      cpp: "TreeNode* lowestCommonAncestor(TreeNode* root, TreeNode* p, TreeNode* q) {\n    return nullptr;\n}"
    },
    constraints: ["All Node.val are unique", "p != q"],
  },
  {
    title: "Binary Tree Level Order Traversal",
    description: "Given the root of a binary tree, return the level order traversal of its nodes' values. (ie, from left to right, level by level).",
    difficulty: "Medium",
    tags: ["Tree", "BFS", "Queue"],
    testCases: [
      { input: "[3,9,20,null,null,15,7]", expectedOutput: "[[3],[9,20],[15,7]]", isHidden: false },
      { input: "[1]", expectedOutput: "[[1]]", isHidden: false },
    ],
    boilerplate: {
      javascript: "function levelOrder(root) {\n  // Write your solution here\n}",
      python: "def level_order(root):\n    pass",
      cpp: "vector<vector<int>> levelOrder(TreeNode* root) {\n    return {};\n}"
    },
    constraints: ["The number of nodes in each tree is in the range [0, 2000]"],
  },
  {
    title: "Serialize and Deserialize Binary Tree",
    description: "Serialization is the process of converting a data structure or object into a sequence of bits so that it can be stored in a file or memory buffer. Design an algorithm to serialize and deserialize a binary tree.",
    difficulty: "Medium",
    tags: ["Tree", "BFS", "String"],
    testCases: [
      { input: "[1,2,3,null,null,4,5]", expectedOutput: "[1,2,3,null,null,4,5]", isHidden: false },
    ],
    boilerplate: {
      javascript: "function serialize(root) {\n  // Write your solution here\n}\nfunction deserialize(data) {\n  // Write your solution here\n}",
      python: "def serialize(root): pass\ndef deserialize(data): pass",
      cpp: "string serialize(TreeNode* root) { return ''; }\nTreeNode* deserialize(string data) { return nullptr; }"
    },
    constraints: ["The number of nodes in the tree is in the range [0, 10^4]"],
  },
  {
    title: "Path Sum III",
    description: "Given the root of a binary tree and an integer targetSum, return the number of paths where the sum of the values along the path equals targetSum. The path does not need to start or end at the root or a leaf, but it must go downwards (i.e., traveling only from parent nodes to child nodes).",
    difficulty: "Medium",
    tags: ["Tree", "DFS", "HashMap"],
    testCases: [
      { input: "root = [10,5,-3,3,2,null,11,3,-2,null,1], targetSum = 8", expectedOutput: "3", isHidden: false },
      { input: "root = [5,4,8,11,null,13,4,7,2,null,null,5,1], targetSum = 22", expectedOutput: "3", isHidden: false },
    ],
    boilerplate: {
      javascript: "function pathSum(root, targetSum) {\n  // Write your solution here\n}",
      python: "def path_sum(root, target_sum):\n    pass",
      cpp: "int pathSum(TreeNode* root, int targetSum) {\n    return 0;\n}"
    },
    constraints: ["The number of nodes in the tree is in the range [0, 1000]"],
  },

  // GRAPHS - Easy (2 problems)
  {
    title: "Number of Islands",
    description: "Given an m x n 2D binary grid grid which represents a map of '1's (land) and '0's (water), return the number of islands. An island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically.",
    difficulty: "Easy",
    tags: ["Graph", "DFS", "BFS"],
    testCases: [
      { input: "[['1','1','1','1','0'],['1','1','0','1','0'],['1','1','0','0','0'],['0','0','0','0','0']]", expectedOutput: "1", isHidden: false },
      { input: "[['1','1','0','0','0'],['1','1','0','0','0'],['0','0','1','0','0'],['0','0','0','1','1']]", expectedOutput: "3", isHidden: false },
    ],
    boilerplate: {
      javascript: "function numIslands(grid) {\n  // Write your solution here\n}",
      python: "def num_islands(grid):\n    pass",
      cpp: "int numIslands(vector<vector<char>>& grid) {\n    return 0;\n}"
    },
    constraints: ["m == grid.length", "n == grid[i].length"],
  },
  {
    title: "Climbing Stairs Graph",
    description: "Given a directed acyclic graph (DAG) with n nodes and m edges, find the longest path in the graph.",
    difficulty: "Easy",
    tags: ["Graph", "DFS", "DP"],
    testCases: [
      { input: "4 edges: (0,1), (0,2), (1,3), (2,3)", expectedOutput: "2", isHidden: false },
    ],
    boilerplate: {
      javascript: "function longestPath(n, edges) {\n  // Write your solution here\n}",
      python: "def longest_path(n, edges):\n    pass",
      cpp: "int longestPath(int n, vector<pair<int,int>>& edges) {\n    return 0;\n}"
    },
    constraints: ["1 <= n <= 1000", "0 <= m <= 1000"],
  },

  // LINKED LISTS - Easy (3 problems)
  {
    title: "Reverse Linked List",
    description: "Given the head of a singly linked list, reverse the list, and return the reversed list.",
    difficulty: "Easy",
    tags: ["Linked List"],
    testCases: [
      { input: "[1,2,3,4,5]", expectedOutput: "[5,4,3,2,1]", isHidden: false },
      { input: "[1,2]", expectedOutput: "[2,1]", isHidden: false },
    ],
    boilerplate: {
      javascript: "function reverseList(head) {\n  // Write your solution here\n}",
      python: "def reverse_list(head):\n    pass",
      cpp: "ListNode* reverseList(ListNode* head) {\n    return nullptr;\n}"
    },
    constraints: ["The number of nodes in the list is the range [0, 5000]"],
  },
  {
    title: "Merge Two Sorted Lists",
    description: "You are given the heads of two sorted linked lists list1 and list2. Merge the two lists in a one sorted list. The list should be made by splicing together the nodes of the two lists. Return the head of the merged linked list.",
    difficulty: "Easy",
    tags: ["Linked List", "Sorting"],
    testCases: [
      { input: "list1 = [1,2,4], list2 = [1,3,4]", expectedOutput: "[1,1,2,3,4,4]", isHidden: false },
      { input: "list1 = [], list2 = [0]", expectedOutput: "[0]", isHidden: false },
    ],
    boilerplate: {
      javascript: "function mergeTwoLists(list1, list2) {\n  // Write your solution here\n}",
      python: "def merge_two_lists(list1, list2):\n    pass",
      cpp: "ListNode* mergeTwoLists(ListNode* list1, ListNode* list2) {\n    return nullptr;\n}"
    },
    constraints: ["The number of nodes in each list is in the range [0, 50]"],
  },
  {
    title: "Linked List Cycle",
    description: "Given head, the head of a linked list, determine if the linked list has a cycle in it. There is a cycle in a linked list if there is some node in the list that can be reached again by continuously following the next pointer.",
    difficulty: "Easy",
    tags: ["Linked List", "Two Pointers"],
    testCases: [
      { input: "head = [3,2,0,-4], pos = 1", expectedOutput: "true", isHidden: false },
      { input: "head = [1,2], pos = 0", expectedOutput: "true", isHidden: false },
    ],
    boilerplate: {
      javascript: "function hasCycle(head) {\n  // Write your solution here\n}",
      python: "def has_cycle(head):\n    pass",
      cpp: "bool hasCycle(ListNode *head) {\n    return false;\n}"
    },
    constraints: ["The number of the nodes in the list is in the range [0, 10^4]"],
  },

  // GREEDY - Easy (3 problems)
  {
    title: "Jump Game",
    description: "You are given an integer array nums. You are initially positioned at the array's first index, and each element in the array represents your maximum jump length from that position. Determine if you can reach the last index.",
    difficulty: "Easy",
    tags: ["Greedy"],
    testCases: [
      { input: "[2,3,1,1,4]", expectedOutput: "true", isHidden: false },
      { input: "[3,2,1,0,4]", expectedOutput: "false", isHidden: false },
    ],
    boilerplate: {
      javascript: "function canJump(nums) {\n  // Write your solution here\n}",
      python: "def can_jump(nums):\n    pass",
      cpp: "bool canJump(vector<int>& nums) {\n    return false;\n}"
    },
    constraints: ["1 <= nums.length <= 10^4", "0 <= nums[i] <= 10^5"],
  },
  {
    title: "Jump Game II",
    description: "Given a 0-indexed array of integers nums of length n. You are initially positioned at nums[0]. Each element nums[i] represents the maximum length of a forward jump from index i. Return the minimum number of jumps to reach nums[n - 1].",
    difficulty: "Easy",
    tags: ["Greedy"],
    testCases: [
      { input: "[2,3,1,1,4]", expectedOutput: "2", isHidden: false, explanation: "Jump 1 step from index 0 to 1, then 3 steps to the last index" },
      { input: "[2,3,0,1,4]", expectedOutput: "2", isHidden: false },
    ],
    boilerplate: {
      javascript: "function jump(nums) {\n  // Write your solution here\n}",
      python: "def jump(nums):\n    pass",
      cpp: "int jump(vector<int>& nums) {\n    return 0;\n}"
    },
    constraints: ["1 <= nums.length <= 10^4", "0 <= nums[i] <= 1000"],
  },
  {
    title: "Gas Station",
    description: "There are n gas stations along a circular route, where the amount of gas at the ith station is gas[i]. You have a car with an unlimited gas tank and it costs cost[i] of gas to travel from station i and next station (i + 1). You begin the journey with an empty tank at one of the gas stations. Given two integer arrays gas and cost, return the starting gas station's index if you can travel around the circuit once in the clockwise direction, otherwise return -1.",
    difficulty: "Easy",
    tags: ["Greedy"],
    testCases: [
      { input: "gas = [1,2,3,4,5], cost = [3,4,5,1,2]", expectedOutput: "3", isHidden: false },
      { input: "gas = [2,3,4], cost = [3,4,3]", expectedOutput: "-1", isHidden: false },
    ],
    boilerplate: {
      javascript: "function canCompleteCircuit(gas, cost) {\n  // Write your solution here\n}",
      python: "def can_complete_circuit(gas, cost):\n    pass",
      cpp: "int canCompleteCircuit(vector<int>& gas, vector<int>& cost) {\n    return 0;\n}"
    },
    constraints: ["n == gas.length == cost.length", "1 <= n <= 10^5"],
  },

  // BACKTRACKING - Medium (4 problems)
  {
    title: "Permutations",
    description: "Given an array nums of distinct integers, return all the possible permutations. You can return the answer in any order.",
    difficulty: "Medium",
    tags: ["Backtracking"],
    testCases: [
      { input: "[1,2,3]", expectedOutput: "[[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]", isHidden: false },
      { input: "[0,1]", expectedOutput: "[[0,1],[1,0]]", isHidden: false },
    ],
    boilerplate: {
      javascript: "function permute(nums) {\n  // Write your solution here\n}",
      python: "def permute(nums):\n    pass",
      cpp: "vector<vector<int>> permute(vector<int>& nums) {\n    return {};\n}"
    },
    constraints: ["1 <= nums.length <= 6", "All the integers of nums are unique"],
  },
  {
    title: "Combinations",
    description: "Given two integers n and k, return all possible combinations of k numbers chosen from the range [1, n].",
    difficulty: "Medium",
    tags: ["Backtracking"],
    testCases: [
      { input: "n = 4, k = 2", expectedOutput: "[[1,2],[1,3],[1,4],[2,3],[2,4],[3,4]]", isHidden: false },
      { input: "n = 1, k = 1", expectedOutput: "[[1]]", isHidden: false },
    ],
    boilerplate: {
      javascript: "function combine(n, k) {\n  // Write your solution here\n}",
      python: "def combine(n, k):\n    pass",
      cpp: "vector<vector<int>> combine(int n, int k) {\n    return {};\n}"
    },
    constraints: ["1 <= n <= 20", "1 <= k <= n"],
  },
  {
    title: "Word Search",
    description: "Given an m x n grid of characters board and a string word, return true if word exists in the grid. The word can be constructed from letters of sequentially adjacent cells, where adjacent cells are horizontally or vertically neighboring.",
    difficulty: "Medium",
    tags: ["Backtracking", "Array"],
    testCases: [
      { input: "board = [['A','B','C','E'],['S','F','C','S'],['A','D','E','E']], word = 'ABCCED'", expectedOutput: "true", isHidden: false },
      { input: "board = [['A','B','C','E'],['S','F','C','S'],['A','D','E','E']], word = 'SEE'", expectedOutput: "true", isHidden: false },
    ],
    boilerplate: {
      javascript: "function exist(board, word) {\n  // Write your solution here\n}",
      python: "def exist(board, word):\n    pass",
      cpp: "bool exist(vector<vector<char>>& board, string word) {\n    return false;\n}"
    },
    constraints: ["m == board.length", "n = board[i].length", "1 <= word.length <= 15"],
  },
  {
    title: "N-Queens",
    description: "The n-queens puzzle is the problem of placing n queens on an n x n chessboard such that no two queens attack each other. Given an integer n, return all distinct solutions to the n-queens puzzle.",
    difficulty: "Medium",
    tags: ["Backtracking"],
    testCases: [
      { input: "n = 4", expectedOutput: "[[ '.. Q..','... Q','Q...','.Q.. '],['Q ...','.. Q.','... Q','.Q.. ']]", isHidden: false },
    ],
    boilerplate: {
      javascript: "function solveNQueens(n) {\n  // Write your solution here\n}",
      python: "def solve_n_queens(n):\n    pass",
      cpp: "vector<vector<string>> solveNQueens(int n) {\n    return {};\n}"
    },
    constraints: ["1 <= n <= 9"],
  },

  // INTERVALS - Medium (2 problems)
  {
    title: "Merge Intervals",
    description: "Given an array of intervals where intervals[i] = [starti, endi], merge all overlapping intervals, and return an array of the non-overlapping intervals.",
    difficulty: "Medium",
    tags: ["Intervals", "Sorting"],
    testCases: [
      { input: "[[1,3],[2,6],[8,10],[15,18]]", expectedOutput: "[[1,6],[8,10],[15,18]]", isHidden: false },
      { input: "[[1,4],[4,5]]", expectedOutput: "[[1,5]]", isHidden: false },
    ],
    boilerplate: {
      javascript: "function merge(intervals) {\n  // Write your solution here\n}",
      python: "def merge(intervals):\n    pass",
      cpp: "vector<vector<int>> merge(vector<vector<int>>& intervals) {\n    return {};\n}"
    },
    constraints: ["1 <= intervals.length <= 10^4"],
  },
  {
    title: "Insert Interval",
    description: "You are given an array of non-overlapping intervals intervals where intervals[i] = [starti, endi] represent the start and end of the ith interval. Insert a new interval newInterval = [newStart, newEnd] into intervals such that intervals is still sorted in ascending order by starti and intervals still does not have any overlapping intervals (merge overlapping intervals if necessary).",
    difficulty: "Medium",
    tags: ["Intervals", "Array"],
    testCases: [
      { input: "intervals = [[1,5]], newInterval = [2,7]", expectedOutput: "[[1,7]]", isHidden: false },
      { input: "intervals = [[1,2],[3,5],[6,7]], newInterval = [5,8]", expectedOutput: "[[1,2],[3,8]]", isHidden: false },
    ],
    boilerplate: {
      javascript: "function insert(intervals, newInterval) {\n  // Write your solution here\n}",
      python: "def insert(intervals, new_interval):\n    pass",
      cpp: "vector<vector<int>> insert(vector<vector<int>>& intervals, vector<int>& newInterval) {\n    return {};\n}"
    },
    constraints: ["0 <= intervals.length <= 10^4"],
  },

  // MATH - Easy (3 problems)
  {
    title: "Palindrome Number",
    description: "Given an integer x, return true if x is a palindrome, and false otherwise.",
    difficulty: "Easy",
    tags: ["Math"],
    testCases: [
      { input: "121", expectedOutput: "true", isHidden: false },
      { input: "-121", expectedOutput: "false", isHidden: false },
    ],
    boilerplate: {
      javascript: "function isPalindrome(x) {\n  // Write your solution here\n}",
      python: "def is_palindrome(x):\n    pass",
      cpp: "bool isPalindrome(int x) {\n    return false;\n}"
    },
    constraints: ["-2^31 <= x <= 2^31 - 1"],
  },
  {
    title: "Roman to Integer",
    description: "Roman numerals are represented by seven different symbols: I, V, X, L, C, D and M. Given a roman numeral, convert it to an integer.",
    difficulty: "Easy",
    tags: ["Math", "String"],
    testCases: [
      { input: "'III'", expectedOutput: "3", isHidden: false },
      { input: "'LVIII'", expectedOutput: "58", isHidden: false },
    ],
    boilerplate: {
      javascript: "function romanToInt(s) {\n  // Write your solution here\n}",
      python: "def roman_to_int(s):\n    pass",
      cpp: "int romanToInt(string s) {\n    return 0;\n}"
    },
    constraints: ["1 <= s.length <= 15"],
  },
  {
    title: "Greatest Common Divisor",
    description: "Given two non-negative integers a and b, return their greatest common divisor (GCD).",
    difficulty: "Easy",
    tags: ["Math"],
    testCases: [
      { input: "a = 48, b = 18", expectedOutput: "6", isHidden: false },
      { input: "a = 1, b = 1", expectedOutput: "1", isHidden: false },
    ],
    boilerplate: {
      javascript: "function gcd(a, b) {\n  // Write your solution here\n}",
      python: "def gcd(a, b):\n    pass",
      cpp: "int gcd(int a, int b) {\n    return 0;\n}"
    },
    constraints: ["0 <= a, b <= 10^6"],
  },

  // TRIE - Medium (2 problems)
  {
    title: "Implement Trie",
    description: "A trie (also called prefix tree) is a tree data structure used to efficiently store and retrieve keys in a dataset of strings. Implement the Trie class.",
    difficulty: "Medium",
    tags: ["Trie"],
    testCases: [
      { input: "insert('apple'), search('apple') returns true, search('app') returns false", expectedOutput: "true, false", isHidden: false },
    ],
    boilerplate: {
      javascript: "class Trie {\n  constructor() {}\n  insert(word) {}\n  search(word) {}\n  startsWith(prefix) {}\n}",
      python: "class Trie:\n    def __init__(self): pass\n    def insert(self, word): pass\n    def search(self, word): pass\n    def starts_with(self, prefix): pass",
      cpp: "class Trie {\npublic:\n    void insert(string word) {}\n    bool search(string word) { return false; }\n    bool startsWith(string prefix) { return false; }\n};"
    },
    constraints: ["1 <= word.length, prefix.length <= 2000"],
  },
  {
    title: "Word Search II",
    description: "Given an m x n board of characters and a list of strings words, return all words on the board. Each word must be constructed from letters of sequentially adjacent cells, where adjacent cells are horizontally or vertically neighboring.",
    difficulty: "Medium",
    tags: ["Trie", "Backtracking"],
    testCases: [
      { input: "board = [['o','a','a','n'],['e','t','a','e'],['i','h','k','r'],['i','f','l','v']], words = ['oath','pea','eat','rain']", expectedOutput: "['eat','oath']", isHidden: false },
    ],
    boilerplate: {
      javascript: "function findWords(board, words) {\n  // Write your solution here\n}",
      python: "def find_words(board, words):\n    pass",
      cpp: "vector<string> findWords(vector<vector<char>>& board, vector<string>& words) {\n    return {};\n}"
    },
    constraints: ["m == board.length", "n == board[i].length"],
  },

  // HEAP - Medium (2 problems)
  {
    title: "Kth Largest Element in an Array",
    description: "Given an integer array nums and an integer k, return the kth largest element in the array. Note that it is the kth largest element in the sorted order, not the kth distinct element.",
    difficulty: "Medium",
    tags: ["Heap", "Quick Select"],
    testCases: [
      { input: "nums = [3,2,1,5,6,4], k = 2", expectedOutput: "5", isHidden: false },
      { input: "nums = [3,2,3,1,2,4,5,5,6], k = 4", expectedOutput: "4", isHidden: false },
    ],
    boilerplate: {
      javascript: "function findKthLargest(nums, k) {\n  // Write your solution here\n}",
      python: "def find_kth_largest(nums, k):\n    pass",
      cpp: "int findKthLargest(vector<int>& nums, int k) {\n    return 0;\n}"
    },
    constraints: ["1 <= k <= nums.length <= 10^5"],
  },
  {
    title: "Top K Frequent Elements",
    description: "Given an integer array nums and an integer k, return the k most frequent elements. You may return the answer in any order.",
    difficulty: "Medium",
    tags: ["Heap", "HashMap"],
    testCases: [
      { input: "nums = [1,1,1,2,2,3], k = 2", expectedOutput: "[1,2]", isHidden: false },
      { input: "nums = [4,1,1,1,2,2,3], k = 2", expectedOutput: "[1,2]", isHidden: false },
    ],
    boilerplate: {
      javascript: "function topKFrequent(nums, k) {\n  // Write your solution here\n}",
      python: "def top_k_frequent(nums, k):\n    pass",
      cpp: "vector<int> topKFrequent(vector<int>& nums, int k) {\n    return {};\n}"
    },
    constraints: ["1 <= nums.length <= 10^5", "k is in the range [1, the number of unique elements]"],
  },

  // HASH MAP - Medium (2 problems)
  {
    title: "LRU Cache",
    description: "Design a data structure that follows the constraints of a Least Recently Used (LRU) cache.",
    difficulty: "Medium",
    tags: ["HashMap", "Linked List"],
    testCases: [
      { input: "LRUCache(2), put(1,1), put(2,2), get(1), put(3,3), get(2)", expectedOutput: "1, null", isHidden: false },
    ],
    boilerplate: {
      javascript: "class LRUCache {\n  constructor(capacity) {}\n  get(key) {}\n  put(key, value) {}\n}",
      python: "class LRUCache:\n    def __init__(self, capacity): pass\n    def get(self, key): pass\n    def put(self, key, value): pass",
      cpp: "class LRUCache {\npublic:\n    LRUCache(int capacity) {}\n    int get(int key) { return 0; }\n    void put(int key, int value) {}\n};"
    },
    constraints: ["1 <= capacity <= 3000"],
  },
  {
    title: "Subarray Sum Equals K",
    description: "Given an array of integers nums and an integer k, return the total number of subarrays whose sum equals to k.",
    difficulty: "Medium",
    tags: ["HashMap", "Array"],
    testCases: [
      { input: "nums = [1,1,1], k = 1", expectedOutput: "3", isHidden: false },
      { input: "nums = [1,2,1,2,1], k = 3", expectedOutput: "2", isHidden: false },
    ],
    boilerplate: {
      javascript: "function subarraySum(nums, k) {\n  // Write your solution here\n}",
      python: "def subarray_sum(nums, k):\n    pass",
      cpp: "int subarraySum(vector<int>& nums, int k) {\n    return 0;\n}"
    },
    constraints: ["-10^7 <= nums[i] <= 10^7", "0 <= k <= 10^9"],
  },

  // STACK - Medium (2 problems)
  {
    title: "Min Stack",
    description: "Design a stack that supports push, pop, top, and retrieving the minimum element in constant time.",
    difficulty: "Medium",
    tags: ["Stack"],
    testCases: [
      { input: "MinStack(), push(-2), push(0), push(-3), getMin() = -3, pop(), top() = 0, getMin() = -2", expectedOutput: "-3, 0, -2", isHidden: false },
    ],
    boilerplate: {
      javascript: "class MinStack {\n  constructor() {}\n  push(val) {}\n  pop() {}\n  top() {}\n  getMin() {}\n}",
      python: "class MinStack:\n    def __init__(self): pass\n    def push(self, val): pass\n    def pop(self): pass\n    def top(self): pass\n    def get_min(self): pass",
      cpp: "class MinStack {\npublic:\n    void push(int val) {}\n    void pop() {}\n    int top() { return 0; }\n    int getMin() { return 0; }\n};"
    },
    constraints: ["-2^31 <= val <= 2^31 - 1"],
  },
  {
    title: "Largest Rectangle in Histogram",
    description: "Given an array of integers heights representing the histogram's bar height where the width of each bar is 1, return the area of the largest rectangle in the histogram.",
    difficulty: "Medium",
    tags: ["Stack"],
    testCases: [
      { input: "[2,1,5,6,2,3]", expectedOutput: "10", isHidden: false },
      { input: "[2,4]", expectedOutput: "4", isHidden: false },
    ],
    boilerplate: {
      javascript: "function largestRectangleArea(heights) {\n  // Write your solution here\n}",
      python: "def largest_rectangle_area(heights):\n    pass",
      cpp: "int largestRectangleArea(vector<int>& heights) {\n    return 0;\n}"
    },
    constraints: ["1 <= heights.length <= 10^5"],
  },

  // QUEUE - Medium (1 problem)
  {
    title: "Sliding Window Maximum",
    description: "You are given an array of integers nums, there is a sliding window of size k which is moving from the very left of the array to the very right. You can only see the k numbers in the window. Each time the sliding window moves right by one position, return an array of the maximum sliding window.",
    difficulty: "Medium",
    tags: ["Queue", "Sliding Window"],
    testCases: [
      { input: "nums = [1,3,-1,-3,5,3,6,7], k = 3", expectedOutput: "[3,3,5,5,6,7]", isHidden: false },
      { input: "nums = [1], k = 1", expectedOutput: "[1]", isHidden: false },
    ],
    boilerplate: {
      javascript: "function maxSlidingWindow(nums, k) {\n  // Write your solution here\n}",
      python: "def max_sliding_window(nums, k):\n    pass",
      cpp: "vector<int> maxSlidingWindow(vector<int>& nums, int k) {\n    return {};\n}"
    },
    constraints: ["1 <= nums.length <= 10^5", "0 <= nums[i] <= 10^4"],
  },
];

const runSeed = async () => {
  try {
    console.log("🌱 Starting problem seed...");
    await database.connect();

    const result = await ProblemModel.bulkWrite(
      seedProblems.map((problem) => ({
        updateOne: {
          filter: { title: problem.title },
          update: { $set: problem },
          upsert: true,
        },
      })),
    );

    console.log(`Seeded problems. Inserted: ${result.upsertedCount}, updated: ${result.modifiedCount}`);
    
    await database.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding problems:", error.message);
    await database.disconnect();
    process.exit(1);
  }
};

runSeed();
