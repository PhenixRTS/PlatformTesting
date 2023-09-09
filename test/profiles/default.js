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
  inherits: null,
  minBitrateMeanKbps: 1600,
  maxBitrateMeanKps: 2100,
  maxDelay: 'PT0.5S',
  maxMeanDelay: 'PT0.5S',
  maxTargetDelayOvershoot: 50,
  maxAverageTargetDelay: 150,
  minFrameRateMean: 30,
  maxFrameRateMean: 31,
  minFrameRate: [
    {
      allowed: 25,
      timesPerMinute: 0
    }
  ],
  maxFrameRate: [
    {
      allowed: 35,
      timesPerMinute: 0
    }
  ],
  maxDroppedFramesPerSecond: 0.01,
  maxPacketLossPerMinute: 3,
  frameWidth: 1280,
  frameHeight: 720,
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
      maxAllowed: 75,
      timesPerMinute: 2
    },
    {
      maxAllowed: 150,
      timesPerMinute: 0
    }
  ],
  maxLag: 'PT0.35S',
  maxRTMPLag: 'PT2.5S',
  syncPublishedVideoFps: 24,
  maxAverageSync: 30,
  maxSingleSync: 70,
  syncWatch_max: 100,
  syncWatch_average: 50
};
const audioProfile = {
  inherits: null,
  minBitrateMeanKbps: 55,
  maxJitter: 30,
  minAudioOutputLevel: 100,
  maxMeanDelay: 'PT0.5S',
  maxPacketsLossPerMinute: 3,
  totalSamplesDurationPerc: 0.8,
  codecName: 'opus',
  maxLag: 'PT0.35S',
  maxRTMPLag: 'PT2.5S',
  audioDelayThresholds: [
    {
      maxAllowed: 300,
      timesPerMinute: 2
    },
    {
      maxAllowed: 500,
      timesPerMinute: 0
    }
  ],
  syncWatch_max: 100,
  syncWatch_average: 50
};
const chatProfile = {
  inherits: null,
  send: {},
  receive: {
    senderToReceiverLag: 'PT0.4S',
    senderToPlatformLag: 'PT0.2S',
    platformToReceiverLag: 'PT0.2S',
    stdDevSenderToReceiverLag: 'PT0.015S',
    historyRequestLag: 'PT1S'
  }
};

module.exports = {
  videoProfile: videoProfile,
  audioProfile: audioProfile,
  chatProfile: chatProfile
};