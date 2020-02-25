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
  minBitrateMeanKbps: 1600,
  maxBitrateMeanKps: 2000,
  maxDelay: 'PT0.5S',
  maxMeanDelay: 'PT0.5S',
  minFrameRateMean: 30,
  maxFrameRate: 31,
  minFrameRate: 24,
  maxDroppedFrames: 0.01,
  maxPacketLossPerMinute: 3,
  frameWidth: 1280,
  frameHeight: 720,
  timeToFirstFrameDecoded: 'PT1S',
  decodedFrameRateTolerance: 0.1,
  maxNacksSentPerMinute: 3,
  firsSent: 0,
  maxPlisSentPerMinute: 2,
  codecName: 'H264',
  maxVideoFreezes: 0,
  maxPTTFF: 3000,
  maxResolutionChangeCountPerMinute: 2,
  interframeDelayThresholds: [
    {
      maxAllowed: 45,
      timesPerMinute: 2
    },
    {
      maxAllowed: 900,
      timesPerMinute: 1
    }
  ],
  maxLag: 'PT0.35S',
  maxRTMPLag: 'PT2.5S',
  syncPublishedVideoFps: 24,
  maxAverageSync: 30,
  maxSingleSync: 70
};
const audioProfile = {
  minBitrateMeanKbps: 60,
  maxJitter: 30,
  minAudioOutputLevel: 100,
  maxDelay: 'PT0.5S',
  maxMeanDelay: 'PT0.5S',
  maxPacketsLossPerMinute: 3,
  totalSamplesDurationPerc: 0.8,
  codecName: 'opus',
  maxLag: 'PT0.35S',
  maxRTMPLag: 'PT2.5S'
};

module.exports = {
  videoProfile: videoProfile,
  audioProfile: audioProfile
};