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
  minBitrateMeanKbps: 1,
  maxBitrateMeanKps: null,
  maxDelay: null,
  maxMeanDelay: null,
  maxTargetDelayOvershoot: null,
  minFrameRateMean: 1,
  minFrameRate: [
    {
      allowed: 18,
      timesPerMinute: 0
    }
  ],
  maxFrameRate: null,
  maxDroppedFrames: null,
  maxPacketLossPerMinute: null,
  frameWidth: null,
  frameHeight: null,
  timeToFirstFrameDecoded: null,
  decodedFrameRateTolerance: null,
  maxNacksSentPerMinute: null,
  firsSent: null,
  maxPlisSentPerMinute: null,
  codecName: null,
  maxVideoFreezes: null,
  maxPTTFF: 25000,
  maxResolutionChangeCountPerMinute: null,
  interframeDelayThresholds: null,
  maxLag: null,
  maxRTMPLag: null,
  syncPublishedVideoFps: 1,
  maxAverageSync: null,
  maxSingleSync: null
};
const audioProfile = {
  minBitrateMeanKbps: 1,
  maxJitter: null,
  minAudioOutputLevel: null,
  maxDelay: null,
  maxMeanDelay: null,
  maxPacketsLossPerMinute: null,
  totalSamplesDurationPerc: 0.1,
  codecName: null,
  maxLag: 'PT1.5S',
  maxRTMPLag: 'PT2.5S'
};

module.exports = {
  videoProfile: videoProfile,
  audioProfile: audioProfile
};