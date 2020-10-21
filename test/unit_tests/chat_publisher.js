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
const testToolChatPublisher = require('../../src/public/js/chat/publisher.js');

describe('When using chat publisher script', function() {
  describe('Given a string', function() {
    it('it returns byte size of the string of numbers', function() {
      assert.deepStrictEqual(testToolChatPublisher.byteSize('0000000000'), 10);
    });

    it('it returns byte size of the string of characters', function() {
      assert.deepStrictEqual(testToolChatPublisher.byteSize('aaaaaaaaaa'), 10);
    });

    it('it returns byte size of the string of symbols', function() {
      assert.deepStrictEqual(testToolChatPublisher.byteSize('$$???£££**'), 13);
    });
  });

  describe('Given min and max value', function() {
    it('it returns random number between passed values', function() {
      const result = testToolChatPublisher.randomNumberFromInterval(1, 10);
      assert.ok(result <= 10);
      assert.ok(result >= 1);
    });
  });

  describe('Given message size and timestamp', function() {
    it('it returns valid message object', function() {
      const expectedMessage = {
        payload: '0000000000000000000000000000000000000000000000000000000000',
        sentTimestamp: '2020.10.2'
      };

      assert.deepStrictEqual(testToolChatPublisher.createMessageToSend(100, '2020.10.2'), expectedMessage);
    });
  });
});