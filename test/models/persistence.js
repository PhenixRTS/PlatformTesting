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

const fs = require('fs');
const path = require('path');
const moment = require('moment');
const config = require('../../config.js');

function saveToFile(fileName, filenamePrefix, content, extension = 'txt', withTimestamp = true) {
  const {reportsPath} = config;

  if (!fs.existsSync(reportsPath)){
    fs.mkdirSync(reportsPath);
  }

  const filePath = path.join(
    reportsPath,
    `${filenamePrefix}-${fileName}${withTimestamp ? moment().format('-YYYY-MM-DD-HH.mm.ss') : ''}.${extension}`
  );

  fs.writeFileSync(filePath, content);

  return filePath;
}

module.exports = {saveToFile};