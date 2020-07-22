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
const testToolShared = require('../../shared/shared');

describe('When using the shared utility', function() {
  describe('Given a real memberId', function() {
    const memberId = 'screenName_primary1_sessionID_us-northeast#HgvNgHuENFafC5xHvXq4xw';

    it('it gets member screenName from memberId using regex', function() {
      assert.deepStrictEqual(testToolShared.getMemberScreenNameFromID(memberId), 'primary1');
    });

    it('it gets member sessionId from memberId using regex', function() {
      assert.deepStrictEqual(testToolShared.getMemberSessionIDFromID(memberId), 'us-northeast#HgvNgHuENFafC5xHvXq4xw');
    });
  });

  describe('Given a fake memberId', function() {
    const fakeMemberId = 'screename_primary1!_session_us-northeast#HgvNgHuENFafC5x!HvXq4xw';

    it('it returns null when screenName regex does not match memberId', function() {
      assert.deepStrictEqual(testToolShared.getMemberScreenNameFromID(fakeMemberId), null);
    });

    it('it returns null when sessionId regex does not match memberId', function() {
      assert.deepStrictEqual(testToolShared.getMemberSessionIDFromID(fakeMemberId), null);
    });
  });
});