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

/* global before */

const assert = require('assert');
const testToolFormat = require('../models/format.js');
const moment = require('moment');

describe('When using the format utility', function() {
  describe('Given a time duration', function() {
    let duration;

    before(function() {
      duration = moment.duration({
        seconds: 10,
        minutes: 2,
        hours: 1
      });
    });

    it('it parses an ISO8601 string to duration', function() {
      assert.deepStrictEqual(testToolFormat.formatTime('PT1H2M10S', 'ms'), duration);
    });

    it('it formats a duration to an ISO8601 string', function() {
      assert.equal(testToolFormat.formatTime(duration), 'PT1H2M10S');
    });
  });

  describe('Given a string', function() {
    it('it detects an ISO8601 string format', function() {
      assert.ok(testToolFormat.isISO8601('PT1D20M5S'));
    });

    it('it does not detect an ISO8601 format', function() {
      assert.strictEqual(testToolFormat.isISO8601('1'), false);
    });
  });

  describe('Given a number', function() {
    it('it rounds to the closest up', function() {
      assert.equal(testToolFormat.round(1.459391, 2), 1.46);
    });

    it('it rounds properly if rounding up is not necessary', function() {
      assert.equal(testToolFormat.round(1.459391, 3), 1.459);
    });

    it('it rounds to 0 places after comma', function() {
      assert.equal(testToolFormat.round(1.459391), 1);
    });
  });

  describe('Given a color code string', function() {
    it('it parses valid HEX format string', function() {
      assert.deepStrictEqual(testToolFormat.parseColor('#35756a'), {
        parsedColor: {
          r: '53',
          g: '117',
          b: '106'
        },
        error: null
      });
    });

    it('it parses valid RGB format string', function() {
      assert.deepStrictEqual(testToolFormat.parseColor('rgb(53, 117, 106)'), {
        parsedColor: {
          r: '53',
          g: '117',
          b: '106'
        },
        error: null
      });
    });

    it('it returns an error message for invalid hex color', function() {
      assert.deepStrictEqual(testToolFormat.parseColor('#a'), {
        parsedColor: null,
        error: 'Error: unsupported color value. Color should be in RGB or HEX'
      });
    });
  });

  describe('Given a color code string', function() {
    it('it formats from valid HEX format string to RGB format string', function() {
      assert.equal(testToolFormat.hexToRgb('#35756a').replace(/ /g, ''), 'rgb(\n53,\n117,\n106\n)');
    });

    it('it formats from valid HEX format string (without "#") to RGB format string', function() {
      assert.equal(testToolFormat.hexToRgb('35756a').replace(/ /g, ''), 'rgb(\n53,\n117,\n106\n)');
    });

    it('it returns empty string for invalid HEX format string', function() {
      assert.equal(testToolFormat.hexToRgb('#a'), '');
    });
  });
});