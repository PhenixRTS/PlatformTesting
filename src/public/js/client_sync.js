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

/* global canvasWidth, canvasHeight, publish, audioSampleRate, beepFrequencyOne, beepFrequencyTwo, fps, oneUnit, log, error, joinChannel, rejoinChannel, getUrlParams, startListeningToSubscriberAudioChanges, showChannelStatus, startFpsStatsLogging, logStreamAndSessionId */

const rtmpPush = getUrlParams('rtmpPush') === 'true';
const channelName = 'Sync test';
const channelAlias = getUrlParams('channelAlias');
let channelJoinRetries = getUrlParams('channelJoinRetries');
const publisherBackendUri = getUrlParams('publisherBackendUri');
const publisherPcastUri = getUrlParams('publisherPcastUri');
const audioFFTSize = 512;
const mediaListenInterval = 10;
const maxColorDifferenceFromPureWhite = 150;

var subscriberCanvas;
var subscriberCanvasCtx;
var subscriberVideoEl;
var subscriberStream;
var subscriberStats;
var lastTimeCentered = new Date();

document.addEventListener('common_loaded', async() => {
  log(`[Url loaded] ${Date.now()}`);
  await prepare();
});

async function prepare() {
  subscriberVideoEl = document.getElementById('subscriberVideoContainer');
  subscriberVideoEl.width = canvasWidth;
  subscriberVideoEl.height = canvasHeight;
  subscriberCanvas = document.getElementById('subscriberCanvas');
  subscriberStats = document.getElementById('subscriberStats');
  subscriberCanvas.width = canvasWidth;
  subscriberCanvas.height = canvasHeight;
  subscriberCanvasCtx = subscriberCanvas.getContext('2d');

  if (rtmpPush) {
    document.getElementById('publisherStats').innerHTML =
      'Using RTMP Push for publishing';
    document.getElementById('publisher').style.display = 'none';
  } else {
    await publish(channelAlias, publisherBackendUri, publisherPcastUri, channelName);
  }
}

function logSubscriberVideoCenter(timestamp) {
  log(`[Subscriber Video] {"timestamp": ${timestamp}}`);
  subscriberStats.innerHTML += `Last centered at ${timestamp}\n`;
}

function logSubscriberAudioBeep(timestamp) {
  log(`[Subscriber Audio] {"timestamp": ${timestamp}}`);
  subscriberStats.innerHTML += `Audio heard at ${timestamp}\n`;
}

// MARK: - Subscriber
// eslint-disable-next-line no-unused-vars
function subscribe() {
  joinChannel(
    subscriberVideoEl,
    channelAlias,
    joinChannelCallback,
    subscriberCallback
  );
}

function joinChannelCallback(receivedError, response) {
  if (receivedError) {
    log('Failed to join channel!');
    log(receivedError);
    error(receivedError.message);
  }

  if (response.status === 'room-not-found') {
    console.warn('Room not found');
  } else if (response.status !== 'ok') {
    error(receivedError.message);
  }

  if (response.status === 'ok' && response.channelService) {
    log('Successfully joined channel');
  }
}

function subscriberCallback(receivedError, response) {
  if (receivedError) {
    error(receivedError);
  }

  let state = 'Joining channel';

  if (response.status === 'no-stream-playing') {
    console.warn('No stream playing');
  } else if (response.status !== 'ok') {
    error(receivedError);

    state =
      channelJoinRetries === 0
        ? 'Failed to join channel'
        : 'Rejoining to channel';

    if (channelJoinRetries > 0) {
      channelJoinRetries--;

      setTimeout(
        rejoinChannel(
          subscriberVideoEl,
          channelAlias,
          joinChannelCallback,
          subscriberCallback
        ),
        1000
      );
    }
  }

  showChannelStatus(`${state}. Got response status: ${response.status}`);

  if (response.renderer) {
    logStreamAndSessionId(response.renderer);
    log(`[Channel Type] Channel`);

    const subscriberVideoEl = document.getElementById('subscriberVideoContainer');
    subscriberVideoEl.muted = false;

    response.renderer.on('autoMuted', () => {
      log(`[${Date.now()}] Stream was autoMuted`);
      subscriberVideoEl.muted = false;
    });

    response.renderer.on('failedToPlay', reason => {
      error(`Failed to play stream. Reason: ${reason}`);
    });
  }

  log(`[Subscriber Stream received] ${Date.now()}`);
  subscriberStream = response.mediaStream;

  subscriberStream.select((track, index) => {
    if (track.kind === 'audio') {
      log(`Subscriber media stream audio [${index}] settings [${JSON.stringify(track.getSettings())}]`);
    }

    return true;
  });

  drawVideoToCanvas();
  startFpsStatsLogging(subscriberStream, getFpsStatsCallback);

  if (subscriberStream === undefined) {
    error('subscriberStream is undefined');
  } else {
    prepareAudioAnalyzer(subscriberStream.Zr);
  }
}

function getFpsStatsCallback(stats) {
  stats.forEach(stat => {
    if (stat.framerateMean) {
      log(`[Stream Framerate Mean] ${JSON.stringify({
        timestamp: Date.now(),
        framerate: stat.framerateMean
      })}`);
    }
  });
}

function prepareAudioAnalyzer(audioStream) {
  var subscriberAudioCtx = new (window.AudioContext ||
    window.webkitAudioContext)();
  subscriberAudioCtx.sampleRate = audioSampleRate;

  var source = subscriberAudioCtx.createMediaStreamSource(audioStream);
  var subscriberAudioAnalyser = subscriberAudioCtx.createAnalyser();
  source.connect(subscriberAudioAnalyser);
  subscriberAudioAnalyser.fftSize = audioFFTSize;

  startListeningToSubscriberAudioChanges(
    subscriberAudioAnalyser,
    mediaListenInterval,
    audioSampleRate,
    frequency => {
      if (frequency === beepFrequencyOne || frequency === beepFrequencyTwo) {
        logSubscriberAudioBeep(Date.now());
      }
    }
  );
}

function drawVideoToCanvas() {
  subscriberCanvasCtx.clearRect(0, 0, canvasWidth, canvasHeight);
  subscriberCanvasCtx.drawImage(
    subscriberVideoEl,
    0,
    0,
    canvasWidth,
    canvasHeight
  );

  if (isCenterPixelColorWhite()) {
    logSubscriberVideoCenter(Date.now());
  }

  requestAnimationFrame(drawVideoToCanvas);
}

function isCenterPixelColorWhite() {
  var now = new Date();

  if (now - lastTimeCentered < 1000 / fps) {
    return false;
  }

  lastTimeCentered = now;

  let imgData = subscriberCanvasCtx.getImageData(
    canvasWidth / 2 - oneUnit / 2,
    canvasHeight / 2,
    oneUnit,
    oneUnit / 2
  ).data;
  let diff = Math.sqrt(
    (imgData[0] - 255) * (imgData[0] - 255) +
      (imgData[1] - 255) * (imgData[1] - 255) +
      (imgData[2] - 255) * (imgData[2] - 255)
  );

  return diff <= maxColorDifferenceFromPureWhite;
}