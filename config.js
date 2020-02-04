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

const path = require('path');

const backendUri = '';
const pcastUri = '';
const channelAlias = '';
const args = undefined;
const localServerAddress = '127.0.0.1';
const testPageUrlAttributes = '';
const reportsPath = path.join(__dirname, 'test', 'reports');
const assetsPath = path.join(__dirname, 'test', 'assets');
const videoAssertProfile = {};
const audioAssertProfile = {};
const projectDir = __dirname;

module.exports = {
  backendUri,
  pcastUri,
  channelAlias,
  args,
  localServerAddress,
  testPageUrlAttributes,
  assetsPath,
  reportsPath,
  videoAssertProfile,
  audioAssertProfile,
  projectDir
};
