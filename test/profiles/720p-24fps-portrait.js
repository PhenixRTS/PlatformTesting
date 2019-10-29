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

var videoProfile = {
  minBitrateMeanKbps: 1600,
  minFramerateMean: 24,
  minFrameRate: 19,
  maxFrameRate: 29,
  frameWidth: 720,
  frameHeight: 1280,
  interframeDelayTresholds: [
    {
      maxAllowed: 45,
      timesPerMin: 5
    },
    {
      maxAllowed: 900,
      timesPerMin: 0
    }
  ]
};

module.exports = {videoProfile: videoProfile};