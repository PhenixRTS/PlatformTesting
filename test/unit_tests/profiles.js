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
const {prepareProfiles} = require('../models/profiles.js');

describe('When using the profiles parser utility', function() {
  const argv = {profileFile: ''};
  const args = {videoProfile: {}};

  describe('Given a profile with no inheritance', function() {
    before(function() {
      argv.profileFile = 'entities/profiles/no-inheritance-profile.js';
      args.videoProfile = {};
    });

    it('it has only in profile defined values', function() {
      const expectedProfileValues = {
        overridableValue: 0,
        noInheritanceValue1: 1,
        noInheritanceValue2: 2
      };
      prepareProfiles(__dirname, argv, args);

      assert.deepStrictEqual(args.videoProfile, expectedProfileValues);
    });
  });

  describe('Given a profile with inheritance', function() {
    before(function() {
      argv.profileFile = 'entities/profiles/inheritance-profile.js';
      args.videoProfile = {};
    });

    it('it inherits all inherited profile values and overrides values with its own', function() {
      const expectedProfileValues = {
        inherits: 'entities/profiles/no-inheritance-profile.js',
        overridableValue: 99,
        noInheritanceValue1: 1,
        noInheritanceValue2: 2
      };
      prepareProfiles(__dirname, argv, args);

      assert.deepStrictEqual(args.videoProfile, expectedProfileValues);
    });
  });
});