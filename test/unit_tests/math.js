/**
 * Copyright 2020 Phenix Real Time Solutions, Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const assert = require('assert');
const testToolMath = require('../models/math.js');

describe('When using the math utility', function() {
  describe('Given an array of numbers', function() {
    it('it gets the average', function() {
      assert.equal(testToolMath.average([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]), 4.5);
    });

    it('it returns 0 when an empty array is passed as an argument', function() {
      assert.equal(testToolMath.average([]), 0);
    });
  });

  describe('Given an array of string numbers', function() {
    it('it gets the average', function() {
      assert.equal(testToolMath.average(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']), 4.5);
    });
  });

  describe('Given an array of numbers and chunk size', function() {
    it('it chunks the array of numbers to the chunks of passed size', function() {
      assert.deepStrictEqual(testToolMath.chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
    });

    it('it chunks the array of strings to the chunks of passed size', function() {
      assert.deepStrictEqual(testToolMath.chunk(['a1', 'b', 'c', 'd1', 'e'], 3), [['a1', 'b', 'c'], ['d1', 'e']]);
    });

    it('it chunks the array of mixed types to the chunks of passed size', function() {
      assert.deepStrictEqual(testToolMath.chunk([1, 2, '3', 4, '5'], 5), [[1, 2, '3', 4, '5']]);
    });

    it('it throws an error if chunk size is set to 0', function() {
      assert.throws(() => testToolMath.chunk([1, 2, 3], 0), Error('Chunk size cannot be 0!'));
    });
  });

  describe('Given two colors', function() {
    it('it returns small color distance', function() {
      assert.equal(testToolMath.getColorDistance({
        r: 3,
        g: 2,
        b: 3
      }, {
        r: 1,
        g: 2,
        b: 3
      }), 2);
    });

    it('it returns big color distance', function() {
      assert.equal(testToolMath.getColorDistance({
        r: 255,
        g: 255,
        b: 255
      }, {
        r: 0,
        g: 0,
        b: 0
      }), 441.6729559300637);
    });

    it('it returns no color distance', function() {
      assert.equal(testToolMath.getColorDistance({
        r: 100,
        g: 200,
        b: 0
      }, {
        r: 100,
        g: 200,
        b: 0
      }), 0);
    });

    it('it returns proper color distance between valid different type RGB format arguments', function() {
      assert.equal(testToolMath.getColorDistance({
        r: '110',
        g: '220',
        b: '10'
      }, {
        r: 100,
        g: 200,
        b: 0
      }), 24.49489742783178);
    });

    it('it throws an error when invalid RGB values are passed', function() {
      assert.throws(() => testToolMath.getColorDistance({
        r: 'a',
        g: 'b',
        b: 'c'
      }, {
        r: 1,
        g: 1,
        b: 1
      }), Error('Wrong parameters passed!'));
    });

    it('it throws an error when invalid parameters are passed', function() {
      assert.throws(() => testToolMath.getColorDistance({}, {
        r: 1,
        g: 1,
        b: 1
      }), Error('Wrong parameters passed!'));
    });
  });
});