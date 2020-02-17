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

import fs from 'fs';
import path from 'path';
import moment from 'moment';

import config from '../../config.js';

function saveToFile(fileName, filenamePrefix, content) {
  const {reportsPath} = config;

  if (!fs.existsSync(reportsPath)){
    fs.mkdirSync(reportsPath);
  }

  fileName = path.join(
    reportsPath,
    `${filenamePrefix}-${fileName}-${moment().format('YYYY-MM-DD-HH.mm.ss')}.txt`
  );

  fs.writeFileSync(fileName, content);
}

export default {saveToFile};