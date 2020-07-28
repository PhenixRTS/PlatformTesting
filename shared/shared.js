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

const chalk = require('chalk');
const fs = require('fs');

(function(exports){
  exports.getMemberScreenNameFromID = id => {
    const matches = id.match(/screenName_(.*?)_sessionID_/);

    return matches ? matches[1] : null;
  };

  exports.getMemberSessionIDFromID = id => {
    const matches = id.match(/sessionID_(.*?)$/);

    return matches ? matches[1] : null;
  };

  // Function takes config argument "tests" and returns either test file name or tests directory name
  // from the test path, depending on which one is given. If the path does not match a directory or is not
  // a .js file it returns the tests argument value as it is.
  exports.getFileNameFromTestsConfigArgument = testsArgument => {
    try {
      const testPath = fs.statSync(testsArgument);

      if (testPath.isFile() && testsArgument.endsWith('.js')){
        testsArgument = testsArgument.replace('.js', '');
      }

      if (testPath.isDirectory() && testsArgument.charAt(testsArgument.length - 1) === '/'){
        testsArgument = testsArgument.slice(0, -1);
      }

      return testsArgument.split('/').pop();
    } catch (e) {
      console.error(chalk.red(`${e}\n`));
    }
  };

  exports.getFileExtensionBasedOnTestcafeReporterType = type => {
    switch (type) {
      case 'xunit':
        return 'xml';
      case 'json':
        return 'json';
      default:
        return 'txt';
    }
  };
}(typeof exports === 'undefined' ? this['shared'] = {} : exports));