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
const moment = require('moment');
const path = require('path');
const fs = require('fs');
const testToolPersistence = require('../models/persistence.js');
const config = require('../../config.js');

describe('When using the persistence utility', function() {
  describe('Given a file name, prefix and content', function() {
    function validateFileExistsAndRemoveIt(fullPath) {
      const fileName = path.basename(fullPath);
      const directory = fullPath.replace(fileName, '');
      fs.readdir(directory, function(err, list) {
        assert(list.indexOf(fileName) > -1);
        fs.unlinkSync(fullPath);
        fs.readdir(directory, function(err, list) {
          if (err) {
            throw err;
          }

          assert(list.indexOf(fileName) === -1);
        });
      });
    }

    it('it sets proper file name and saves the file', function() {
      const dateNow = moment().format('YYYY-MM-DD-HH.mm.ss');
      const fullPath = testToolPersistence.saveToFile('name', 'prefix', 'abc');
      assert.equal(path.basename(fullPath), `prefix-name-${dateNow}.txt`);
      validateFileExistsAndRemoveIt(fullPath);
    });

    it('it uses report path from config file for the location where to save the file', function() {
      config.reportsPath = 'customUnitTestConfigPath';

      const dateNow = moment().format('YYYY-MM-DD-HH.mm.ss');
      const fullPath = testToolPersistence.saveToFile('name', 'prefix', 'abc');
      const expected = path.join(
        config.reportsPath,
        `prefix-name-${dateNow}.txt`
      );
      assert.equal(fullPath, expected);
      validateFileExistsAndRemoveIt(fullPath);
    });
  });
});