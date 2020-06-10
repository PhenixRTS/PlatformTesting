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

/* global log, error, joinChannel, rejoinChannel, getUrlParams, rgbToHex, startListeningToSubscriberAudioChanges, constants, jsQR, moment, showChannelStatus, publish */

const rtmpPush = getUrlParams('rtmpPush') === 'true';
const channelName = 'Lag test';
const channelAlias = getUrlParams('channelAlias');
let channelJoinRetries = getUrlParams('channelJoinRetries');
let channelExpress = null;

var publisherBackendUri = getUrlParams('publisherBackendUri');
var publisherPcastUri = getUrlParams('publisherPcastUri');

var subscriberVideoEl;
var subscriberCanvas;
var subscriberCanvasCtx;
var subscriberCanvasColorVal;
var subscriberDrawInterval = null;

var subscriberOscilloscopeEl;
var subscriberFrequencyGraphEl;
var subscriberFrequencyValueEl;
var subscriberAudioAnalyser;
var subscriberAudioFrequencyDataArray;
var subscriberAudioTimeDataArray;

var subscriberStream;
var subscriberDecodedTimestamp;
var previousSubscriberColor = {
  r: 0,
  g: 0,
  b: 0
};

var audioSampleRate = 44100;
var audioFFTSize = 512;

var colorListenInterval = 10;
var mediaListenInterval = 60;
const timestampDecodeInterval = 1000;

document.addEventListener('DOMContentLoaded', async() => {
  log(`[Url loaded] ${Date.now()}`);
  await prepare();
});

async function prepare() {
  subscriberVideoEl = document.getElementById('subscriberVideoContainer');
  subscriberOscilloscopeEl = document.getElementById('subscriberOscilloscope');
  subscriberFrequencyGraphEl = document.getElementById('subscriberFreqGraph');
  subscriberFrequencyValueEl = document.getElementById('subscriberFreqValue');
  subscriberDecodedTimestamp = document.getElementById('decodedQRTimestamp');

  subscriberCanvas = document.getElementById('subscriberCanvas');
  subscriberCanvasCtx = subscriberCanvas.getContext('2d');
  subscriberCanvasColorVal = document.getElementById(
    'subscriberCanvasColorVal'
  );

  if (rtmpPush) {
    document.getElementById('publisherStats').innerHTML =
      'Using RTMP Push for publishing';
    document.getElementById('publisher').style.display = 'none';
  } else {
    await publish(channelAlias, publisherBackendUri, publisherPcastUri, channelName);
  }
}

function logSubscriberAudioChanges(timestamp, frequency) {
  log(
    `[Subscriber Audio] {"timestamp": ${timestamp}, "frequency": ${frequency}}`
  );
  subscriberFrequencyValueEl.innerHTML = `Got ${frequency} Hz`;
}

function logDecodedTimestamp() {
  setInterval(() => {
    decodeQR();
  }, timestampDecodeInterval);
}

function decodeQR() {
  const {height, width, position} = constants.qrCode;
  const timeReceived = Date.now();
  const qrImageData = subscriberCanvasCtx.getImageData(
    position.x,
    position.y,
    width,
    height
  ).data;
  const qrCode = jsQR(qrImageData, width, height);

  if (qrCode) {
    const qrTime = moment.utc(Number(qrCode.data)).format();

    subscriberDecodedTimestamp.innerHTML = `QR Code data: ${qrTime}`;
    log(
      `[Subscriber Video] {"type": "${constants.lagType.time}", "timestamp": ${timeReceived}, "qrTimestamp": ${qrCode.data}}`
    );
  }
}

function listenToSubscriberVideoChanges() {
  var imgData = subscriberCanvasCtx.getImageData(200, 200, 1, 1).data;
  var color = {
    r: imgData[0],
    g: imgData[1],
    b: imgData[2]
  };

  const {r, g, b} = color;

  if (
    r !== previousSubscriberColor.r ||
    g !== previousSubscriberColor.g ||
    b !== previousSubscriberColor.b
  ) {
    const timestamp = Date.now();

    log(
      `[Subscriber Video] {"type": "${constants.lagType.color}", "timestamp": ${timestamp}, "color": {"r": ${r}, "g": ${g}, "b": ${b}}}`
    );

    subscriberCanvasColorVal.innerHTML = `Got: HEX ${rgbToHex(
      color
    )} | RGB ${JSON.stringify(color)}`;

    previousSubscriberColor = color;
  }
}

// MARK: - Subscriber
// eslint-disable-next-line no-unused-vars
function subscribe() {
  channelExpress = joinChannel(
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
  }

  if (response.status === 'room-not-found') {
    console.warn('Room not found');
  } else if (response.status !== 'ok') {
    error(receivedError);
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
    error(`Got status: ${response.status}`);

    state =
      channelJoinRetries === 0
        ? 'Failed to join channel'
        : 'Rejoining to channel';

    if (channelJoinRetries > 0) {
      channelJoinRetries--;

      setTimeout(
        rejoinChannel(
          channelExpress,
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
    log(`[${Date.now()}] Stream renderer received`);
    log(`[Stream ID] ${response.renderer.ji}`);

    response.renderer.on('autoMuted', () => {
      log(`[${Date.now()}] Stream was autoMuted`);

      subscriberVideoEl.muted = false;
      subscriberVideoEl.play();
    });

    response.renderer.on('failedToPlay', reason => {
      error(`Failed to play stream. Reason: ${reason}`);
    });
  }

  log(`[Subscriber Stream received] ${Date.now()}`);
  subscriberStream = response.mediaStream;

  if (subscriberStream === undefined) {
    error('subscriberStream is undefined');

    return;
  }

  if (subscriberDrawInterval === null) {
    subscriberDrawInterval = setInterval(() => {
      drawToCanvas();
    }, colorListenInterval);
  }

  if (rtmpPush) {
    logDecodedTimestamp();
  }

  prepareAudioAnalyzer(subscriberStream.Zo);
  drawAudioVisualisations();
}

function drawToCanvas() {
  subscriberCanvasCtx.clearRect(
    0,
    0,
    subscriberCanvas.width,
    subscriberCanvas.height
  );
  subscriberCanvasCtx.drawImage(subscriberVideoEl, 0, 0, 500, 500);

  if (!rtmpPush) {
    listenToSubscriberVideoChanges();
  }
}

function prepareAudioAnalyzer(mediaStream) {
  var subscriberAudioCtx = new (window.AudioContext ||
    window.webkitAudioContext)();
  subscriberAudioCtx.sampleRate = audioSampleRate;

  var source = subscriberAudioCtx.createMediaStreamSource(mediaStream);
  subscriberAudioAnalyser = subscriberAudioCtx.createAnalyser();
  source.connect(subscriberAudioAnalyser);
  subscriberAudioAnalyser.fftSize = audioFFTSize;

  startListeningToSubscriberAudioChanges(
    subscriberAudioAnalyser,
    mediaListenInterval,
    audioSampleRate,
    frequency => {
      logSubscriberAudioChanges(Date.now(), frequency);
    }
  );

  subscriberAudioTimeDataArray = new Uint8Array(
    subscriberAudioAnalyser.frequencyBinCount
  );
  subscriberAudioFrequencyDataArray = new Float32Array(
    subscriberAudioAnalyser.frequencyBinCount
  );
}

// MARK: - Audio visualisation

function drawAudioVisualisations() {
  requestAnimationFrame(drawAudioVisualisations);

  if (subscriberAudioAnalyser === undefined) {
    return;
  }

  subscriberAudioAnalyser.getByteTimeDomainData(subscriberAudioTimeDataArray);

  var canvasOscCtx = subscriberOscilloscopeEl.getContext('2d');
  canvasOscCtx.fillStyle = 'rgb(200, 200, 200)';
  canvasOscCtx.fillRect(0, 0, 500, 300);
  drawLine(subscriberOscilloscopeEl, subscriberAudioTimeDataArray);

  subscriberAudioAnalyser.getFloatFrequencyData(
    subscriberAudioFrequencyDataArray
  );

  var canvasFreqCtx = subscriberFrequencyGraphEl.getContext('2d');
  canvasFreqCtx.fillStyle = 'rgb(200, 200, 200)';
  canvasFreqCtx.fillRect(0, 0, 500, 300);
  drawBars(subscriberFrequencyGraphEl, subscriberAudioFrequencyDataArray);
}

function drawBars(canvasEl, dataArray) {
  var canvasCtx = canvasEl.getContext('2d');
  var barWidth =
    (canvasEl.width / subscriberAudioAnalyser.frequencyBinCount) * 2.5;
  var barHeight;
  var x = 0;
  canvasCtx.beginPath();

  for (var i = 0; i < subscriberAudioAnalyser.frequencyBinCount; i++) {
    barHeight = -dataArray[i] / 2;
    canvasCtx.fillStyle = 'rgb(' + (barHeight + 100) + ', 50, 50)';
    canvasCtx.fillRect(x, canvasEl.height - barHeight / 2, barWidth, barHeight);
    x += barWidth + 1;
  }
}

function drawLine(canvasEl, dataArray) {
  var publisherCanvas = document.getElementById('publisherCanvas');
  var canvasCtx = canvasEl.getContext('2d');
  canvasCtx.lineWidth = 2;
  canvasCtx.strokeStyle = 'rgb(0, 0, 0)';
  canvasCtx.beginPath();

  var sliceWidth = canvasEl.width / subscriberAudioAnalyser.frequencyBinCount;
  var x = 0;

  for (var i = 0; i < subscriberAudioAnalyser.frequencyBinCount; i++) {
    var v = dataArray[i] / 128.0;
    var y = (v * canvasEl.height) / 2;

    i === 0 ? canvasCtx.moveTo(x, y) : canvasCtx.lineTo(x, y);
    x += sliceWidth;
  }

  canvasCtx.lineTo(publisherCanvas.width, publisherCanvas.height / 2);
  canvasCtx.stroke();
}