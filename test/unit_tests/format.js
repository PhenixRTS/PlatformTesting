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
const {formatTime} = require('../models/format');

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
    describe('When choosing standard rounding', function() {
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

    describe('When choosing rounding down', function() {
      it('it rounds number with digit 5 after comma down', function() {
        assert.equal(testToolFormat.round(1.459391, 1, 'down'), 1.4);
      });
    });

    describe('By rounding up', function() {
      it('it rounds number with digit 5 after comma up', function() {
        assert.equal(testToolFormat.round(1.419391, 1, 'up'), 1.5);
      });
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

  describe('Given a test actual value is a decimal number', function() {
    describe('When a test expected value is ISO8601 format type', function() {
      it('it rounds value up to closest int', function() {
        assert.equal(testToolFormat.formatMsgActualValue(100.1545, formatTime('PT0.1S', 'ms'), 'leq'), 101);
      });

      it('it rounds value down (if it matches expected value after rounding up) for \'eql\' case', function() {
        assert.equal(testToolFormat.formatMsgActualValue(99.9827, formatTime('PT0.1S', 'ms'), 'eq'), 99);
      });

      it('it rounds value down (if it matches expected value after rounding up) for \'deql\' case', function() {
        assert.equal(testToolFormat.formatMsgActualValue(99.9243, formatTime('PT0.1S', 'ms'), 'deql'), 99);
      });

      it('it rounds value up for \'gt\' case', function() {
        assert.equal(testToolFormat.formatMsgActualValue(99.9, formatTime('PT0.1S', 'ms'), 'gt'), 100);
      });

      it('it rounds value down (if it matches expected value after rounding up) for \'gte\' case', function() {
        assert.equal(testToolFormat.formatMsgActualValue(99.9, formatTime('PT0.1S', 'ms'), 'gte'), 99);
      });

      it('it rounds value down (if it matches expected value after rounding up) for \'lt\' case', function() {
        assert.equal(testToolFormat.formatMsgActualValue(99.9, formatTime('PT0.1S', 'ms'), 'lt'), 99);
      });

      it('it rounds value up for \'lte\' case', function() {
        assert.equal(testToolFormat.formatMsgActualValue(99.9, formatTime('PT0.1S', 'ms'), 'lte'), 100);
      });
    });

    describe('When test expected value is a decimal value', function() {
      it('it rounds value to the closest with 1 digit after comma', function() {
        assert.equal(testToolFormat.formatMsgActualValue(1.459391, 2, 'eql'), 1.5);
      });

      it('it rounds value down (if it matches expected value after rounding up) for \'eql\' case', function() {
        assert.equal(testToolFormat.formatMsgActualValue(23.9853, 24, 'eq'), 23.9);
      });

      it('it rounds value down (if it matches expected value after rounding up) for \'deql\' case', function() {
        assert.equal(testToolFormat.formatMsgActualValue(23.9853, 24, 'deql'), 23.9);
      });

      it('it rounds value up (if it matches expected value after rounding up) for \'gt\' case', function() {
        assert.equal(testToolFormat.formatMsgActualValue(23.9853, 24, 'gt'), 24);
      });

      it('it rounds value down (if it matches expected value after rounding up) for \'gte\' case', function() {
        assert.equal(testToolFormat.formatMsgActualValue(23.9853, 24, 'gte'), 23.9);
      });

      it('it rounds value down (if it matches expected value after rounding up) for \'lt\' case', function() {
        assert.equal(testToolFormat.formatMsgActualValue(23.9853, 24, 'lt'), 23.9);
      });

      it('it rounds value up (if it matches expected value after rounding up) for \'lte\' case', function() {
        assert.equal(testToolFormat.formatMsgActualValue(23.9853, 24, 'lte'), 24);
      });

      it('it rounds value up (if it matches expected value after rounding down) for \'eql\' case', function() {
        assert.equal(testToolFormat.formatMsgActualValue(30.024, 30, 'eq'), 30.1);
      });

      it('it rounds value up (if it matches expected value after rounding down) for \'deql\' case', function() {
        assert.equal(testToolFormat.formatMsgActualValue(30.024, 30, 'deql'), 30.1);
      });

      it('it rounds value up (if it matches expected value after rounding down) for \'gt\' case', function() {
        assert.equal(testToolFormat.formatMsgActualValue(30.024, 30, 'gt'), 30.1);
      });

      it('it rounds value down (if it matches expected value after rounding down) for \'gte\' case', function() {
        assert.equal(testToolFormat.formatMsgActualValue(30.024, 30, 'gte'), 30);
      });

      it('it rounds value down (if it matches expected value after rounding down) for \'lt\' case', function() {
        assert.equal(testToolFormat.formatMsgActualValue(30.024, 30, 'lt'), 30);
      });

      it('it rounds value up (if it matches expected value after rounding down) for \'lte\' case', function() {
        assert.equal(testToolFormat.formatMsgActualValue(30.024, 30, 'lte'), 30.1);
      });
    });
  });
});