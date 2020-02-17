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

const Logger = require('./logger.js');
const logger = new Logger('');

function run(module) {
  if (typeof module !== 'object') { // eslint-disable-line lodash/prefer-lodash-typecheck
    throw new Error(`run accepts object argument only, ${module} was passed in`);
  }

  const start = new Date();
  logger.log(`Starting ${global.process.argv[2]}...`);

  return module
    .finally(() => {
      const end = new Date();
      const time = end.getTime() - start.getTime();
      logger.log(`Finished ${global.process.argv[2]} after ${time} ms`);
    }).catch(e => {
      throw e;
    });
}

if (global.process.argv.length > 2) {
  const module = require(`./${global.process.argv[2]}.js`);

  run(module)
    .catch(err => {
      if (err.length) {
        err.forEach(e => console.error(e));
      } else {
        console.error(err);
      }

      global.process.exit(1);
    });
}

module.exports = run;