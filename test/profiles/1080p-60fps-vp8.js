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
  minBitrateMeanKbps: 3000,
  maxBitrateMeanKps: 3750,
  minFrameRateMean: 60,
  minFrameRate: [
    {
      allowed: 48,
      timesPerMinute: 1
    }
  ],
  maxFrameRate: [
    {
      allowed: 62,
      timesPerMinute: 1
    }
  ],
  frameWidth: 1920,
  frameHeight: 1080,
  codecName: 'VP8'
};

module.exports = {videoProfile: videoProfile};