/**
 * Copyright 2019 Phenix Real Time Solutions, Inc. All Rights Reserved.
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

class Logger {
  constructor(prefix) {
    this.prefix = prefix;
  }

  log(msg) {
    console.log(`[${this.format(new Date())}] [${this.prefix}] ${msg}`);
  }

  error(msg) {
    console.error(`[Acceptance Testing ERROR] ${msg}`);
  }

  format(datetime) {
    return [
      datetime.getHours().toString().padStart(2, '0'),
      datetime.getMinutes().toString().padStart(2, '0'),
      datetime.getSeconds().toString().padStart(2, '0')
    ].join(':');
  }
}

module.exports = Logger;