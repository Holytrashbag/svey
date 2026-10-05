import { test } from 'node:test'
import assert from 'node:assert'
import { estimateBracket } from './bracket-estimator.ts'

test('a deck with no salt data defaults to bracket 2', () => {
  assert.strictEqual(estimateBracket([]), 2)
})

test('average salt maps onto brackets 1-5', () => {
  assert.strictEqual(estimateBracket([0, 0, 0]), 1)
  assert.strictEqual(estimateBracket([0.7]), 2)
  assert.strictEqual(estimateBracket([1.2]), 3)
  assert.strictEqual(estimateBracket([2.0]), 4)
  assert.strictEqual(estimateBracket([3.5]), 5)
})

test('bracket boundaries are inclusive on the upper bracket', () => {
  assert.strictEqual(estimateBracket([0.5]), 2)
  assert.strictEqual(estimateBracket([1.0]), 3)
  assert.strictEqual(estimateBracket([1.5]), 4)
  assert.strictEqual(estimateBracket([2.5]), 5)
})

test('uses the mean, so a few salty cards are diluted by a casual list', () => {
  // One 4.0 card among nine 0.0 cards averages 0.4 → still bracket 1.
  assert.strictEqual(estimateBracket([4, 0, 0, 0, 0, 0, 0, 0, 0, 0]), 1)
})
