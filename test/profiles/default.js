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

const videoProfile = {
  minBitrateMeanKbps: 1600,
  maxBitrateMeanKps: 2000,
  maxDelay: 500,
  maxMeanDelay: 500,
  minFramerateMean: 30,
  maxFrameRate: 31,
  minFrameRate: 24,
  maxDroppedFrames: 0.01,
  maxPacketLossPerMin: 3,
  frameWidth: 1280,
  frameHeight: 720,
  maxMsToFirstFrameDecoded: 1000,
  maxNacksSentPerMin: 3,
  firsSent: 0,
  maxPlisSentPerMin: 2,
  codecName: 'H264',
  maxVideoFreezes: 0,
  maxPTTFF: 3000,
  maxResolutionChangeCountPerMin: 2,
  interframeDelayTresholds: [
    {
      maxAllowed: 45,
      timesPerMin: 2
    },
    {
      maxAllowed: 900,
      timesPerMin: 1
    }
  ],
  maxLag: 350
};
const audioProfile = {
  minBitrateMeanKbps: 60,
  maxJitter: 30,
  minAudioOutputLevel: 100,
  maxDelay: 500,
  maxMeanDelay: 500,
  maxPacketsLossPerMin: 3,
  totalSamplesDurationPerc: 0.8,
  codecName: 'opus',
  maxLag: 350
};

module.exports = {
  videoProfile: videoProfile,
  audioProfile: audioProfile
};