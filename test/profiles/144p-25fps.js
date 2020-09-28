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

const videoProfile = {
  inherits: 'test/profiles/default.js',
  minBitrateMeanKbps: 80,
  minFrameRateMean: 25,
  minFrameRate: [
    {
      allowed: 20,
      timesPerMinute: 0
    }
  ],
  maxFrameRate: [
    {
      allowed: 30,
      timesPerMinute: 0
    }
  ],
  frameWidth: 256,
  frameHeight: 144
};
const audioProfile = {inherits: 'test/profiles/default.js'};

const chatProfile = {inherits: 'test/profiles/default.js'};

module.exports = {
  videoProfile: videoProfile,
  audioProfile: audioProfile,
  chatProfile: chatProfile
};