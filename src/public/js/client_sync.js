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

/* global log, error, joinChannel, rejoinChannel, getUrlParams, publishTo, startListeningToSubscriberAudioChanges, startMultimediaRecordingFor, showPublisherMessage, showChannelStatus */

const rtmpPush = getUrlParams('rtmpPush') === 'true';
const channelAlias = getUrlParams('channelAlias');
let channelJoinRetries = getUrlParams('channelJoinRetries');
const channelName = 'Sync test';
let channelExpress = null;
const audioSampleRate = 44100;
const audioFFTSize = 512;
const publisherBackendUri = getUrlParams('publisherBackendUri');
const publisherPcastUri = getUrlParams('publisherPcastUri');
const fps = getUrlParams('syncFps');
const fpsInterval = 1000 / fps;
const oneUnit = 16;
const dotRadius = oneUnit / 2;
const canvasHeight = 512;
const canvasWidth = 512;
const beepFrequency = 200;
const beepDuration = 1000 / fps;
const mediaListenInterval = 10;

var publisherCanvas;
var publisherCanvasCtx;
var publisherStats;
var publisher;
var publisherVideoEl;
var publisherSourceNode;
var testMediaStream;

var streamDestination;
var subscriberCanvas;
var subscriberCanvasCtx;
var subscriberVideoEl;
var subscriberStream;
var subscriberStats;
var oscillator;
var audioCtx;

var now;
var elapsed;
var then = Date.now();
var startTime = then;
var frameCount = 0;
var currentPosX = oneUnit / 2;
var currentPosY = canvasHeight / 2;
var currentDotPosX = canvasWidth / 2;
var currentDotPosY = dotRadius;
var moveRight = false;
var moveDown = false;
var lastTimeCentered = new Date();

document.addEventListener('DOMContentLoaded', () => {
  log(`[Url loaded] ${Date.now()}`);
  prepare();
});

function prepare() {
  subscriberVideoEl = document.getElementById('subscriberVideoContainer');
  publisherStats = document.getElementById('publisherStats');
  subscriberVideoEl.width = canvasWidth;
  subscriberVideoEl.height = canvasHeight;
  subscriberCanvas = document.getElementById('subscriberCanvas');
  subscriberStats = document.getElementById('subscriberStats');
  subscriberCanvas.width = canvasWidth;
  subscriberCanvas.height = canvasHeight;
  subscriberCanvasCtx = subscriberCanvas.getContext('2d');

  publisherVideoEl = document.getElementById('publisherVideoContainer');
  publisherCanvas = document.getElementById('publisherCanvas');
  publisherCanvas.width = canvasWidth;
  publisherCanvas.height = canvasHeight;
  publisherCanvasCtx = publisherCanvas.getContext('2d');

  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  audioCtx.sampleRate = audioSampleRate;

  streamDestination = audioCtx.createMediaStreamDestination();
  publisherSourceNode = audioCtx.createMediaElementSource(publisherVideoEl);
  publisherSourceNode.connect(streamDestination);

  publisherSourceNode.connect(streamDestination);
  publisherSourceNode.connect(audioCtx.destination);

  var audioTrack = streamDestination.stream.getAudioTracks()[0];

  testMediaStream = publisherCanvas.captureStream();
  testMediaStream.addTrack(audioTrack);

  publisherVideoEl.srcObject = testMediaStream;

  if (rtmpPush) {
    publisherStats.innerHTML = 'Using RTMP Push for publishing';
    document.getElementById('publisherVideoContainerTitle').style.display = 'none';
    publisherVideoEl.style.display = 'none';
    document.getElementById('publisherCanvasTitle').style.display = 'none';
    publisherCanvas.style.display = 'none';
  } else {
    drawCanvas();
    move();
    publish();
  }

  const publisherRecordingMs = getUrlParams('publisherRecordingMs');
  window.publisherRecordingMs = publisherRecordingMs;

  if (publisherRecordingMs > 0) {
    setTimeout(() => {
      startMultimediaRecordingFor(publisherRecordingMs, publisherVideoEl.captureStream());
    }, 5000);
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

// MARK: - Publisher

function drawCanvas() {
  publisherCanvasCtx.clearRect(0, 0, publisherCanvas.width, publisherCanvas.height);
  drawHorizontalGrid();
}

function drawHorizontalGrid() {
  publisherCanvasCtx.beginPath();
  publisherCanvasCtx.lineWidth = 2;
  publisherCanvasCtx.strokeStyle = '#c3061f';

  publisherCanvasCtx.moveTo(0, publisherCanvas.height / 2);
  publisherCanvasCtx.lineTo(publisherCanvas.width, publisherCanvas.height / 2);
  publisherCanvasCtx.stroke();

  publisherCanvasCtx.moveTo(publisherCanvas.width / 2, 0);
  publisherCanvasCtx.lineTo(publisherCanvas.width / 2, publisherCanvas.height);
  publisherCanvasCtx.stroke();

  var number = canvasWidth / oneUnit / 2 + 1;
  for (let i = -oneUnit; i < canvasWidth; i += oneUnit) {
    drawText(number, 12, i, publisherCanvas.height / 2 + 40);
    number += (i <= canvasWidth / 2 - oneUnit) ? -1 : 1;
  }
}

function drawText(text, size, posX, posY) {
  publisherCanvasCtx.beginPath();
  publisherCanvasCtx.fillStyle = '#000000';
  publisherCanvasCtx.fillRect(posX, posY, oneUnit, oneUnit / 2);

  publisherCanvasCtx.font = `${size}px Arial`;
  publisherCanvasCtx.fillStyle = '#e79ba5';
  publisherCanvasCtx.textAlign = 'center';
  publisherCanvasCtx.fillText(text, posX, posY);
}

function drawHorizontalMarkers() {
  for (let i = 0; i < canvasWidth; i += oneUnit) {
    publisherCanvasCtx.beginPath();
    publisherCanvasCtx.moveTo(i, publisherCanvas.height / 2);
    publisherCanvasCtx.lineTo(i, publisherCanvas.height / 2 + 20);
    publisherCanvasCtx.strokeStyle = '#e79ba5';
    publisherCanvasCtx.stroke();
  }
}

function drawRectAt(x, y, sizeX, sizeY, color) {
  publisherCanvasCtx.beginPath();
  publisherCanvasCtx.fillStyle = color;
  publisherCanvasCtx.fillRect(x, y, sizeX, sizeY);
}

function updateRectPosition() {
  if (currentPosX >= publisherCanvas.width - 2 * oneUnit || currentPosX === oneUnit / 2) {
    moveRight = !moveRight;
    drawHorizontalMarkers();

    var posY = canvasHeight - canvasHeight / 4;
    drawRectAt(canvasWidth / 4 - 50, posY - 50, 100, 100, '#000000');
    drawRectAt(canvasWidth - canvasWidth / 4 - 50, posY - 50, 100, 100, '#000000');
    drawText(moveRight ? 'VIDEO late' : 'AUDIO late', 18, canvasWidth / 4, posY);
    drawText(moveRight ? 'AUDIO late' : 'VIDEO late', 18, canvasWidth - canvasWidth / 4, posY);
  }

  drawRectAt(currentPosX, currentPosY, oneUnit, oneUnit / 2, '#000000');
  currentPosX += moveRight ? oneUnit : -oneUnit;
  drawRectAt(currentPosX, currentPosY, oneUnit, oneUnit / 2, '#ffffff');

  if (currentPosX === canvasWidth / 2 - oneUnit / 2) {
    playBeep();
  }
}

function drawDotAt(x, y, color) {
  publisherCanvasCtx.beginPath();
  publisherCanvasCtx.fillStyle = color;
  publisherCanvasCtx.arc(x, y, oneUnit / 2 + (color === '#000000' ? 1 : 0), 0, Math.PI * 2, false);
  publisherCanvasCtx.fill();
}

function updateDotPosition() {
  if (currentDotPosY === publisherCanvas.height / 2 - dotRadius || currentDotPosY === dotRadius) {
    moveDown = !moveDown;
  }

  drawDotAt(currentDotPosX, currentDotPosY, '#000000');
  currentDotPosY += moveDown ? oneUnit : -oneUnit;
  drawDotAt(currentDotPosX, currentDotPosY, '#ffffff');
}

function move() {
  requestAnimationFrame(move);
  now = Date.now();
  elapsed = now - then;

  if (elapsed >= fpsInterval) {
    then = now - (elapsed % fpsInterval);

    updateRectPosition();
    updateDotPosition();

    var sinceStart = now - startTime;
    publisherStats.innerText = 'Publishing ' + (Math.round(sinceStart / 1000 * 100) / 100) + ' seconds @ ' + (Math.round(1000 / (sinceStart / ++frameCount) * 100) / 100) + ' fps';
  }
}

function playBeep() {
  oscillator = audioCtx.createOscillator();
  oscillator.frequency.value = beepFrequency;
  oscillator.type = 'square';
  oscillator.connect(streamDestination);
  oscillator.start(audioCtx.currentTime);

  setTimeout(() => {
    oscillator.stop(audioCtx.currentTime);
  }, beepDuration);
}

function publish() {
  publishTo(channelAlias, testMediaStream, publisherBackendUri, publisherPcastUri, channelName, publishCallback);
}

function publishCallback(error, response) {
  if (error) {
    log('PublishCallback returned error=' + error.message);
    showPublisherMessage(`\nPublish callback returned error: ${error.message}\n`);
    stopPublisher();

    throw error;
  }

  if (response.status !== 'ok' && response.status !== 'ended' && response.status !== 'stream-ended') {
    stopPublisher();
    showPublisherMessage(`\nError in publish callback. Got response status: ${response.status}\n`);

    throw new Error(response.status);
  }

  if (response.status === 'ok') {
    publisher = response.publisher;
    subscribe();
    showPublisherMessage('\nPublished successfully!\n');
  }
}

function stopPublisher() {
  if (publisher) {
    publisher.stop();
    publisher = null;
  }
}

// MARK: - Subscriber

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

    state = channelJoinRetries === 0 ? 'Failed to join channel' : 'Rejoining to channel';

    if (channelJoinRetries > 0) {
      channelJoinRetries--;

      setTimeout(rejoinChannel(
        channelExpress,
        subscriberVideoEl,
        channelAlias,
        joinChannelCallback,
        subscriberCallback
      ), 1000);
    }
  }

  showChannelStatus(`${state}. Got response status: ${response.status}`);

  if (response.renderer) {
    log(`[${Date.now()}] Stream renderer received`);
    response.renderer.on('autoMuted', () => {
      log(`[${Date.now()}] Stream was autoMuted`);
      document.getElementById('videoEl').muted = false;
      document.getElementById('videoEl').play();
    });

    response.renderer.on('failedToPlay', (reason) => {
      error(`Failed to play stream. Reason: ${reason}`);
    });
  }

  log(`[Subscriber Stream received] ${Date.now()}`);
  subscriberStream = response.mediaStream;

  drawVideoToCanvas();

  if (subscriberStream === undefined) {
    error('subscriberStream is undefined');
  } else {
    prepareAudioAnalyzer(subscriberStream.Zo);
  }
}

function prepareAudioAnalyzer(audioStream) {
  var subscriberAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  subscriberAudioCtx.sampleRate = audioSampleRate;

  var source = subscriberAudioCtx.createMediaStreamSource(audioStream);
  var subscriberAudioAnalyser = subscriberAudioCtx.createAnalyser();
  source.connect(subscriberAudioAnalyser);
  subscriberAudioAnalyser.fftSize = audioFFTSize;

  startListeningToSubscriberAudioChanges(subscriberAudioAnalyser, mediaListenInterval, audioSampleRate, ((frequency) => {
    if (frequency === beepFrequency) {
      logSubscriberAudioBeep(Date.now());
    }
  }));
}

function drawVideoToCanvas() {
  subscriberCanvasCtx.clearRect(0, 0, canvasWidth, canvasHeight);
  subscriberCanvasCtx.drawImage(subscriberVideoEl, 0, 0, canvasWidth, canvasHeight);

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

  let imgData = subscriberCanvasCtx.getImageData((canvasWidth / 2) - (oneUnit / 2), canvasHeight / 2, oneUnit, oneUnit / 2).data;
  let diff = Math.sqrt(
    (imgData[0] - 255) * (imgData[0] - 255) +
    (imgData[1] - 255) * (imgData[1] - 255) +
    (imgData[2] - 255) * (imgData[2] - 255)
  );

  return diff <= 65;
}