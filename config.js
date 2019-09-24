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
const baseUrl = 'https://phenixrts.com';
const channelAlias = 'clock';
const args = undefined;
const localServerAddress = '127.0.0.1';
const localServerPort = '3000';
const testPageUrl = '';
const reportsPath = path.join(__dirname, 'test', 'reports'); // eslint-disable-line no-undef
// Assert values
const assertAudioBitrateAbove = 30000;
const assertAudioJitterBelow = 60;

module.exports = {
  baseUrl: baseUrl,
  channelAlias: channelAlias,
  args: args,
  localServerAddress: localServerAddress,
  localServerPort: localServerPort,
  testPageUrl: testPageUrl,
  reportsPath: reportsPath,

  assertAudioBitrateAbove: assertAudioBitrateAbove,
  assertAudioJitterBelow: assertAudioJitterBelow
};