import { PrismaClient } from '@prisma/client';

interface TestCaseSeed {
  input: string;
  expectedOutput: string;
  isSample: boolean;
  order: number;
}

interface ProblemSeed {
  slug: string;
  title: string;
  statement: string;
  difficulty: string;
  topics: string[];
  companies: string[];
  tags: string[];
  testCases: TestCaseSeed[];
}

/**
 * Representative curated problem catalog. Sheets below map onto these slugs —
 * this keeps the seed self-contained and guarantees every sheet references real
 * Problem rows (no empty/fake sheets).
 */
const PROBLEMS: ProblemSeed[] = [
  {
    slug: 'two-sum',
    title: 'Two Sum',
    statement:
      'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume each input has exactly one solution, and you may not use the same element twice.',
    difficulty: 'easy',
    topics: ['array', 'hash-map'],
    companies: ['Google', 'Amazon', 'Microsoft'],
    tags: ['hash-table'],
    testCases: [
      { input: '2\n7\n11\n15\n9\n', expectedOutput: '0 1\n', isSample: true, order: 1 },
      { input: '3\n3\n2\n4\n6\n', expectedOutput: '1 2\n', isSample: false, order: 2 },
    ],
  },
  {
    slug: 'valid-parentheses',
    title: 'Valid Parentheses',
    statement:
      'Given a string s containing just the characters (, ), {, }, [ and ], determine if the input string is valid. A string is valid if brackets close in the correct order and every close bracket has a corresponding open bracket of the same type.',
    difficulty: 'easy',
    topics: ['stack', 'string'],
    companies: ['Google', 'Amazon', 'Microsoft'],
    tags: ['stack'],
    testCases: [
      { input: '6\n()[]{}\n', expectedOutput: 'true\n', isSample: true, order: 1 },
      { input: '4\n([)]\n', expectedOutput: 'false\n', isSample: false, order: 2 },
    ],
  },
  {
    slug: 'merge-two-sorted-lists',
    title: 'Merge Two Sorted Lists',
    statement:
      'You are given the heads of two sorted linked lists list1 and list2. Merge the two lists into one sorted list by splicing together the nodes of the first two lists, then return the head of the merged linked list.',
    difficulty: 'easy',
    topics: ['linked-list'],
    companies: ['Google', 'Amazon'],
    tags: ['linked-list'],
    testCases: [
      { input: '2\n1\n2\n2\n3\n4\n', expectedOutput: '1 2 3 4\n', isSample: true, order: 1 },
      { input: '0\n1\n5\n', expectedOutput: '5\n', isSample: false, order: 2 },
    ],
  },
  {
    slug: 'best-time-to-buy-and-sell-stock',
    title: 'Best Time to Buy and Sell Stock',
    statement:
      'You are given an array prices where prices[i] is the price of a given stock on the ith day. You want to maximize your profit by choosing a single day to buy one stock and a different day in the future to sell it. Return the maximum profit, or 0 if no profit is possible.',
    difficulty: 'easy',
    topics: ['array'],
    companies: ['Google', 'Amazon', 'Microsoft'],
    tags: ['sliding-window'],
    testCases: [
      { input: '6\n7\n1\n5\n3\n6\n4\n', expectedOutput: '5\n', isSample: true, order: 1 },
      { input: '5\n7\n6\n4\n3\n1\n', expectedOutput: '0\n', isSample: false, order: 2 },
    ],
  },
  {
    slug: 'climbing-stairs',
    title: 'Climbing Stairs',
    statement:
      'You are climbing a staircase. It takes n steps to reach the top. Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?',
    difficulty: 'easy',
    topics: ['dp'],
    companies: ['Google', 'Amazon'],
    tags: ['dp'],
    testCases: [
      { input: '2\n', expectedOutput: '2\n', isSample: true, order: 1 },
      { input: '3\n', expectedOutput: '3\n', isSample: false, order: 2 },
    ],
  },
  {
    slug: 'maximum-subarray',
    title: 'Maximum Subarray',
    statement:
      'Given an integer array nums, find the subarray with the largest sum and return its sum.',
    difficulty: 'medium',
    topics: ['array', 'dp'],
    companies: ['Google', 'Amazon', 'Microsoft'],
    tags: ['dp'],
    testCases: [
      {
        input: '9\n-2\n1\n-3\n4\n-1\n2\n1\n-5\n4\n',
        expectedOutput: '6\n',
        isSample: true,
        order: 1,
      },
      { input: '1\n1\n', expectedOutput: '1\n', isSample: false, order: 2 },
    ],
  },
  {
    slug: 'product-of-array-except-self',
    title: 'Product of Array Except Self',
    statement:
      'Given an integer array nums, return an array answer such that answer[i] is equal to the product of all the elements of nums except nums[i]. Solve it without division in O(n) time.',
    difficulty: 'medium',
    topics: ['array'],
    companies: ['Google', 'Amazon'],
    tags: ['prefix-sum'],
    testCases: [
      { input: '4\n1\n2\n3\n4\n', expectedOutput: '24 12 8 6\n', isSample: true, order: 1 },
      { input: '3\n-1\n1\n0\n', expectedOutput: '0 0 -1\n', isSample: false, order: 2 },
    ],
  },
  {
    slug: 'group-anagrams',
    title: 'Group Anagrams',
    statement:
      'Given an array of strings strs, group the anagrams together. You can return the answer in any order.',
    difficulty: 'medium',
    topics: ['hash-map', 'string'],
    companies: ['Google', 'Amazon'],
    tags: ['hash-table'],
    testCases: [
      {
        input: '6\nate\ntea\neat\nnat\nbat\ntan\n',
        expectedOutput: '3\n',
        isSample: true,
        order: 1,
      },
      { input: '1\n\n', expectedOutput: '1\n', isSample: false, order: 2 },
    ],
  },
  {
    slug: 'longest-substring-without-repeating-characters',
    title: 'Longest Substring Without Repeating Characters',
    statement:
      'Given a string s, find the length of the longest substring without repeating characters.',
    difficulty: 'medium',
    topics: ['string', 'sliding-window'],
    companies: ['Google', 'Amazon', 'Microsoft'],
    tags: ['sliding-window'],
    testCases: [
      { input: '5\nabcabcbb\n', expectedOutput: '3\n', isSample: true, order: 1 },
      { input: '1\nbbbbb\n', expectedOutput: '1\n', isSample: false, order: 2 },
    ],
  },
  {
    slug: 'three-sum',
    title: '3Sum',
    statement:
      'Given an integer array nums, return all the triplets [nums[i], nums[j], nums[k]] such that i, j and k are distinct and nums[i] + nums[j] + nums[k] == 0. The solution set must not contain duplicate triplets.',
    difficulty: 'medium',
    topics: ['array', 'two-pointers'],
    companies: ['Google', 'Amazon', 'Microsoft'],
    tags: ['two-pointers'],
    testCases: [
      { input: '6\n-1\n0\n1\n2\n-1\n-4\n', expectedOutput: '2\n', isSample: true, order: 1 },
      { input: '3\n0\n1\n1\n', expectedOutput: '0\n', isSample: false, order: 2 },
    ],
  },
  {
    slug: 'coin-change',
    title: 'Coin Change',
    statement:
      'You are given an integer array coins representing coins of different denominations and an integer amount. Return the fewest number of coins you need to make up that amount, or -1 if that amount cannot be made up.',
    difficulty: 'medium',
    topics: ['dp'],
    companies: ['Google', 'Amazon'],
    tags: ['dp'],
    testCases: [
      { input: '3\n1\n2\n5\n11\n', expectedOutput: '3\n', isSample: true, order: 1 },
      { input: '1\n2\n3\n', expectedOutput: '-1\n', isSample: false, order: 2 },
    ],
  },
  {
    slug: 'word-search',
    title: 'Word Search',
    statement:
      'Given an m x n grid of characters board and a string word, return true if word exists in the grid. The word can be constructed from letters of sequentially adjacent cells, where adjacent cells are horizontally or vertically neighboring. The same letter cell may not be used more than once.',
    difficulty: 'medium',
    topics: ['backtracking'],
    companies: ['Google', 'Amazon'],
    tags: ['backtracking'],
    testCases: [
      {
        input: '3\n4\nABCE\nSFCS\nADEE\nABCCED\n',
        expectedOutput: 'true\n',
        isSample: true,
        order: 1,
      },
      {
        input: '3\n4\nABCE\nSFCS\nADEE\nABCB\n',
        expectedOutput: 'false\n',
        isSample: false,
        order: 2,
      },
    ],
  },
];

/** Curated, versioned sheets mapping onto the catalog above by slug. */
const SHEETS: Array<{
  slug: string;
  name: string;
  description: string;
  problemSlugs: string[];
}> = [
  {
    slug: 'blind-75',
    name: 'Blind 75',
    description:
      'The 75 most essential LeetCode-style problems, ordered by frequency of interview use.',
    problemSlugs: [
      'two-sum',
      'valid-parentheses',
      'merge-two-sorted-lists',
      'best-time-to-buy-and-sell-stock',
      'maximum-subarray',
      'product-of-array-except-self',
      'climbing-stairs',
      'three-sum',
      'group-anagrams',
      'longest-substring-without-repeating-characters',
      'coin-change',
      'word-search',
    ],
  },
  {
    slug: 'grind-169',
    name: 'Grind 169',
    description:
      'A curated superset of the Blind 75 focused on the problems that show up most in interviews.',
    problemSlugs: [
      'two-sum',
      'valid-parentheses',
      'climbing-stairs',
      'best-time-to-buy-and-sell-stock',
      'maximum-subarray',
      'coin-change',
      'group-anagrams',
      'three-sum',
    ],
  },
  {
    slug: 'neetcode-150',
    name: 'NeetCode 150',
    description:
      'The popular 150-problem practice roadmap organised by topic for structured revision.',
    problemSlugs: [
      'two-sum',
      'valid-parentheses',
      'group-anagrams',
      'product-of-array-except-self',
      'longest-substring-without-repeating-characters',
      'three-sum',
      'maximum-subarray',
      'coin-change',
      'word-search',
    ],
  },
  {
    slug: 'google',
    name: 'Google — Interview Prep',
    description: 'Company-specific practice set built from problems asked in Google interviews.',
    problemSlugs: [
      'two-sum',
      'valid-parentheses',
      'group-anagrams',
      'word-search',
      'longest-substring-without-repeating-characters',
    ],
  },
  {
    slug: 'amazon',
    name: 'Amazon — Interview Prep',
    description: 'Company-specific practice set built from problems asked in Amazon interviews.',
    problemSlugs: ['two-sum', 'best-time-to-buy-and-sell-stock', 'three-sum', 'coin-change'],
  },
];

/**
 * Idempotent seed of the DSA problem catalog + curated sheets. Both problems
 * and sheet entries are upserted, so re-running the seed never duplicates rows.
 */
export async function seedDsaCatalog(prisma: PrismaClient): Promise<void> {
  const bySlug = new Map<string, string>();
  for (const problem of PROBLEMS) {
    const created = await prisma.problem.upsert({
      where: { slug: problem.slug },
      update: {
        title: problem.title,
        statement: problem.statement,
        difficulty: problem.difficulty,
        topics: problem.topics,
        companies: problem.companies,
        tags: problem.tags,
        isActive: true,
      },
      create: {
        slug: problem.slug,
        title: problem.title,
        statement: problem.statement,
        difficulty: problem.difficulty,
        topics: problem.topics,
        companies: problem.companies,
        tags: problem.tags,
        isActive: true,
      },
    });
    bySlug.set(problem.slug, created.id);

    await prisma.testCase.deleteMany({ where: { problemId: created.id, isSample: false } });
    await prisma.testCase.deleteMany({ where: { problemId: created.id, isSample: true } });
    for (const testCase of problem.testCases) {
      await prisma.testCase.create({
        data: {
          problemId: created.id,
          input: testCase.input,
          expectedOutput: testCase.expectedOutput,
          isSample: testCase.isSample,
          order: testCase.order,
        },
      });
    }
  }

  for (const sheet of SHEETS) {
    const existing = await prisma.sheet.upsert({
      where: { slug: sheet.slug },
      update: { name: sheet.name, description: sheet.description, isActive: true },
      create: {
        slug: sheet.slug,
        name: sheet.name,
        description: sheet.description,
        isActive: true,
      },
    });

    const slugs = sheet.problemSlugs.filter((slug) => bySlug.has(slug));
    for (let index = 0; index < slugs.length; index += 1) {
      await prisma.sheetProblem.upsert({
        where: {
          sheetId_problemId: { sheetId: existing.id, problemId: bySlug.get(slugs[index])! },
        },
        update: { order: index + 1 },
        create: {
          sheetId: existing.id,
          problemId: bySlug.get(slugs[index])!,
          order: index + 1,
        },
      });
    }
  }
}
