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

(function(exports){
  exports.getMemberScreenNameFromID = id => {
    const matches = id.match(/screenName_(.*?)_sessionID_/);

    return matches ? matches[1] : null;
  };

  exports.getMemberSessionIDFromID = id => {
    const matches = id.match(/sessionID_(.*?)$/);

    return matches ? matches[1] : null;
  };

  exports.getFileNameFromTestsConfigArgument = testsArgument => {
    let fileName;

    if (testsArgument.includes('test/fixtures/') && testsArgument.includes('.js')){
      fileName = testsArgument.match(/(?<=test\/fixtures\/)(.*)(?=\.js)/g);
    } else if (!testsArgument.includes('.js') && testsArgument.includes('/')) {
      if (testsArgument.charAt(testsArgument.length - 1) === '/'){
        testsArgument = testsArgument.slice(0, -1);
      }

      fileName = testsArgument.match(/([^\/]*)\/*$/g)[0];
    } else {
      fileName = testsArgument;
    }

    return fileName;
  };
}(typeof exports === 'undefined' ? this['shared'] = {} : exports));