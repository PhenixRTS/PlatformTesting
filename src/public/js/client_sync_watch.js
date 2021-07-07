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

/* global canvasWidth, canvasHeight, publish, audioSampleRate, beepFrequencyOne, beepFrequencyTwo, fps, oneUnit, log, logStat, error, joinChannel, rejoinChannel, getUrlParams, startListeningToSubscriberAudioChanges, showChannelStatus, startFpsStatsLogging, logStreamAndSessionId */

const rtmpPush = getUrlParams('rtmpPush') === 'true';
const channelName = 'Sync Watch test';
const channelAlias = getUrlParams('channelAlias');
let channelJoinRetriesOne = getUrlParams('channelJoinRetries');
let channelJoinRetriesTwo = getUrlParams('channelJoinRetries');
const publisherBackendUri = getUrlParams('publisherBackendUri');
const publisherPcastUri = getUrlParams('publisherPcastUri');
const pcastUriSecondSubscriber = getUrlParams('pcastUriSecondSubscriber');
const audioFFTSize = 512;
const mediaListenInterval = 10;
const maxColorDifferenceFromPureWhite = 150;

var subscriberOneCanvas;
var subscriberOneCanvasCtx;
var subscriberOneVideoEl;
var subscriberOneStream;
var subscriberOneStats;
var lastTimeCenteredOne = new Date();

var subscriberTwoCanvas;
var subscriberTwoCanvasCtx;
var subscriberTwoVideoEl;
var subscriberTwoStream;
var subscriberTwoStats;
var lastTimeCenteredTwo = new Date();

document.addEventListener('common_loaded', async() => {
  logStat(`[Url loaded] ${Date.now()}`);
  await prepare();
});

async function prepare() {
  subscriberOneVideoEl = document.getElementById('subscriberOneVideoContainer');
  subscriberOneVideoEl.width = canvasWidth;
  subscriberOneVideoEl.height = canvasHeight;
  subscriberOneCanvas = document.getElementById('subscriberOneCanvas');
  subscriberOneStats = document.getElementById('subscriberOneStats');
  subscriberOneCanvas.width = canvasWidth;
  subscriberOneCanvas.height = canvasHeight;
  subscriberOneCanvasCtx = subscriberOneCanvas.getContext('2d');

  subscriberTwoVideoEl = document.getElementById('subscriberTwoVideoContainer');
  subscriberTwoVideoEl.width = canvasWidth;
  subscriberTwoVideoEl.height = canvasHeight;
  subscriberTwoCanvas = document.getElementById('subscriberTwoCanvas');
  subscriberTwoStats = document.getElementById('subscriberTwoStats');
  subscriberTwoCanvas.width = canvasWidth;
  subscriberTwoCanvas.height = canvasHeight;
  subscriberTwoCanvasCtx = subscriberTwoCanvas.getContext('2d');

  if (rtmpPush) {
    document.getElementById('publisherStats').innerHTML =
      'Using RTMP Push for publishing';
    document.getElementById('publisher').style.display = 'none';
  } else {
    await publish(channelAlias, publisherBackendUri, publisherPcastUri, channelName);
  }
}

function logSubscriberOneVideoCenter(timestamp) {
  logStat(`[Subscriber One Video] {"timestamp": ${timestamp}}`);
  subscriberOneStats.innerHTML += `Last centered at ${timestamp}\n`;
}

function logSubscriberTwoVideoCenter(timestamp) {
  logStat(`[Subscriber Two Video] {"timestamp": ${timestamp}}`);
  subscriberTwoStats.innerHTML += `Last centered at ${timestamp}\n`;
}

function logSubscriberOneAudioBeep(timestamp) {
  logStat(`[Subscriber One Audio] {"timestamp": ${timestamp}}`);
  subscriberOneStats.innerHTML += `Audio heard at ${timestamp}\n`;
}

function logSubscriberTwoAudioBeep(timestamp) {
  logStat(`[Subscriber Two Audio] {"timestamp": ${timestamp}}`);
  subscriberTwoStats.innerHTML += `Audio heard at ${timestamp}\n`;
}

// MARK: - Subscriber
// eslint-disable-next-line no-unused-vars
function subscribe() {
  log('Subscribing first participant from client side');
  joinChannel(
    subscriberOneVideoEl,
    channelAlias,
    joinChannelCallback,
    subscriberOneCallback
  );

  log('Subscribing second participant from client side');
  joinChannel(
    subscriberTwoVideoEl,
    channelAlias,
    joinChannelCallback,
    subscriberTwoCallback,
    pcastUriSecondSubscriber
  );

  drawVideoToCanvas();
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

function subscriberOneCallback(receivedError, response) {
  if (receivedError) {
    error(receivedError, 'subscriberOneError');
  }

  let state = 'Joining channel';

  if (response.status === 'no-stream-playing') {
    console.warn('No stream playing');

    return;
  } else if (response.status !== 'ok') {
    error(receivedError, 'subscriberOneError');

    state =
      channelJoinRetriesOne === 0
        ? 'Failed to join channel'
        : 'Rejoining to channel';

    if (channelJoinRetriesOne > 0) {
      channelJoinRetriesOne--;

      setTimeout(
        rejoinChannel(
          subscriberOneVideoEl,
          channelAlias,
          joinChannelCallback,
          subscriberOneCallback
        ),
        1000
      );
    }
  }

  showChannelStatus(`${state}. Got response status: ${response.status}`, 'subscriberOneChannelStatus');

  if (response.renderer) {
    logStreamAndSessionId(response.renderer, 'Stream One ID', 'Session One ID');
    logStat(`[Channel Type] Channel`);

    const subscriberOneVideoEl = document.getElementById('subscriberOneVideoContainer');
    subscriberOneVideoEl.muted = false;

    response.renderer.on('autoMuted', () => {
      log(`[${Date.now()}] Stream One was autoMuted`);
      subscriberOneVideoEl.muted = false;
    });

    response.renderer.on('failedToPlay', reason => {
      error(`Failed to play stream. Reason: ${reason}`, 'subscriberOneError');
    });
  }

  log(`[Subscriber Stream One received] ${Date.now()}`);
  subscriberOneStream = response.mediaStream;

  subscriberOneStream.select((track, index) => {
    if (track.kind === 'audio') {
      log(`Subscriber One media stream audio [${index}] settings [${JSON.stringify(track.getSettings())}]`);
    }

    return true;
  });

  startFpsStatsLogging(subscriberOneStream, getFpsStatsOneCallback);

  prepareAudioAnalyzer(subscriberOneStream.Zr, logSubscriberOneAudioBeep);
}

function subscriberTwoCallback(receivedError, response) {
  if (receivedError) {
    error(receivedError, 'subscriberTwoError');
  }

  let state = 'Joining channel';

  if (response.status === 'no-stream-playing') {
    console.warn('No stream playing');

    return;
  } else if (response.status !== 'ok') {
    error(receivedError, 'subscriberTwoError');

    state =
      channelJoinRetriesTwo === 0
        ? 'Failed to join channel'
        : 'Rejoining to channel';

    if (channelJoinRetriesTwo > 0) {
      channelJoinRetriesTwo--;

      setTimeout(
        rejoinChannel(
          subscriberTwoVideoEl,
          channelAlias,
          joinChannelCallback,
          subscriberTwoCallback
        ),
        1000
      );
    }
  }

  showChannelStatus(`${state}. Got response status: ${response.status}`, 'subscriberTwoChannelStatus');

  if (response.renderer) {
    logStreamAndSessionId(response.renderer, 'Stream Two ID', 'Session Two ID');
    logStat(`[Channel Type] Channel`);

    const subscriberTwoVideoEl = document.getElementById('subscriberTwoVideoContainer');
    subscriberTwoVideoEl.muted = false;

    response.renderer.on('autoMuted', () => {
      log(`[${Date.now()}] Stream Two was autoMuted`);
      subscriberTwoVideoEl.muted = false;
    });

    response.renderer.on('failedToPlay', reason => {
      error(`Failed to play stream. Reason: ${reason}`, 'subscriberTwoError');
    });
  }

  logStat(`[Subscriber Stream Two received] ${Date.now()}`);
  subscriberTwoStream = response.mediaStream;

  subscriberTwoStream.select((track, index) => {
    if (track.kind === 'audio') {
      log(`Subscriber Two media stream audio [${index}] settings [${JSON.stringify(track.getSettings())}]`);
    }

    return true;
  });

  startFpsStatsLogging(subscriberTwoStream, getFpsStatsTwoCallback);

  prepareAudioAnalyzer(subscriberTwoStream.Zr, logSubscriberTwoAudioBeep);
}

function getFpsStatsOneCallback(stats) {
  stats.forEach(stat => {
    if (stat.framerateMean) {
      logStat(`[Stream One Framerate Mean] ${JSON.stringify({
        timestamp: Date.now(),
        framerate: stat.framerateMean
      })}`);
    }
  });
}

function getFpsStatsTwoCallback(stats) {
  stats.forEach(stat => {
    if (stat.framerateMean) {
      logStat(`[Stream Two Framerate Mean] ${JSON.stringify({
        timestamp: Date.now(),
        framerate: stat.framerateMean
      })}`);
    }
  });
}

function prepareAudioAnalyzer(audioStream, beepCallback) {
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
        beepCallback(Date.now());
      }
    }
  );
}

function drawVideoToCanvas() {
  subscriberOneCanvasCtx.clearRect(0, 0, canvasWidth, canvasHeight);
  subscriberOneCanvasCtx.drawImage(
    subscriberOneVideoEl,
    0,
    0,
    canvasWidth,
    canvasHeight
  );

  if (isCenterPixelColorWhite(lastTimeCenteredOne, subscriberOneCanvasCtx)) {
    logSubscriberOneVideoCenter(Date.now());
  }

  subscriberTwoCanvasCtx.clearRect(0, 0, canvasWidth, canvasHeight);
  subscriberTwoCanvasCtx.drawImage(
    subscriberTwoVideoEl,
    0,
    0,
    canvasWidth,
    canvasHeight
  );

  if (isCenterPixelColorWhite(lastTimeCenteredTwo, subscriberTwoCanvasCtx)) {
    logSubscriberTwoVideoCenter(Date.now());
  }

  requestAnimationFrame(drawVideoToCanvas);
}

function isCenterPixelColorWhite(lastTimeCentered, canvasCtx) {
  var now = new Date();

  if (now - lastTimeCentered < 1000 / fps) {
    return false;
  }

  lastTimeCentered = now;

  let imgData = canvasCtx.getImageData(
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