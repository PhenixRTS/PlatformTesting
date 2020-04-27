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

/* global log, getUrlParams, publishTo, startMultimediaRecordingFor, showPublisherMessage, subscribe */

const audioSampleRate = 44100;
const fps = getUrlParams('syncFps');
const fpsInterval = 1000 / fps;
const oneUnit = 16;
const dotRadius = oneUnit / 2;
const canvasHeight = 512;
const canvasWidth = 512;
const beepFrequency = 200;
const beepDuration = 1000 / fps;

var publisherCanvas;
var publisherCanvasCtx;
var publisherStats;
var publisher;
var publisherVideoEl;
var testMediaStream;

var audioCtx;
var streamDestination;
var oscillator;
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

const initPublisher = () => {
  publisherVideoEl = document.getElementById('publisherVideoContainer');
  publisherCanvas = document.getElementById('publisherCanvas');
  publisherCanvas.width = canvasWidth;
  publisherCanvas.height = canvasHeight;
  publisherCanvasCtx = publisherCanvas.getContext('2d');

  publisherStats = document.getElementById('publisherStats');

  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  audioCtx.sampleRate = audioSampleRate;

  streamDestination = audioCtx.createMediaStreamDestination();

  const publisherSourceNode = audioCtx.createMediaElementSource(
    publisherVideoEl
  );
  publisherSourceNode.connect(streamDestination);

  publisherSourceNode.connect(streamDestination);
  publisherSourceNode.connect(audioCtx.destination);

  const audioTrack = streamDestination.stream.getAudioTracks()[0];

  testMediaStream = publisherCanvas.captureStream();
  testMediaStream.addTrack(audioTrack);

  publisherVideoEl.srcObject = testMediaStream;

  drawCanvas();
  move();

  const publisherRecordingMs = getUrlParams('publisherRecordingMs');
  window.publisherRecordingMs = publisherRecordingMs;

  if (publisherRecordingMs > 0) {
    setTimeout(() => {
      startMultimediaRecordingFor(
        publisherRecordingMs,
        publisherVideoEl.captureStream()
      );
    }, 5000);
  }

  return testMediaStream;
};

// eslint-disable-next-line no-unused-vars
async function publish(
  channelAlias,
  publisherBackendUri,
  publisherPcastUri,
  channelName
) {
  testMediaStream = initPublisher();

  await publishTo(
    channelAlias,
    testMediaStream,
    publisherBackendUri,
    publisherPcastUri,
    channelName,
    publishCallback
  );
}

function publishCallback(error, response) {
  if (error) {
    log('PublishCallback returned error=' + error.message);
    showPublisherMessage(
      `\nPublish callback returned error: ${error.message}\n`
    );
    stopPublisher();

    throw error;
  }

  if (
    response.status !== 'ok' &&
    response.status !== 'ended' &&
    response.status !== 'stream-ended'
  ) {
    stopPublisher();
    showPublisherMessage(
      `\nError in publish callback. Got response status: ${response.status}\n`
    );

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

function drawCanvas() {
  publisherCanvasCtx.clearRect(
    0,
    0,
    publisherCanvas.width,
    publisherCanvas.height
  );
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
    number += i <= canvasWidth / 2 - oneUnit ? -1 : 1;
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
  if (
    currentPosX >= publisherCanvas.width - 2 * oneUnit ||
    currentPosX === oneUnit / 2
  ) {
    moveRight = !moveRight;
    drawHorizontalMarkers();

    var posY = canvasHeight - canvasHeight / 4;
    drawRectAt(canvasWidth / 4 - 50, posY - 50, 100, 100, '#000000');
    drawRectAt(
      canvasWidth - canvasWidth / 4 - 50,
      posY - 50,
      100,
      100,
      '#000000'
    );
    drawText(
      moveRight ? 'VIDEO late' : 'AUDIO late',
      18,
      canvasWidth / 4,
      posY
    );
    drawText(
      moveRight ? 'AUDIO late' : 'VIDEO late',
      18,
      canvasWidth - canvasWidth / 4,
      posY
    );
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
  publisherCanvasCtx.arc(
    x,
    y,
    oneUnit / 2 + (color === '#000000' ? 1 : 0),
    0,
    Math.PI * 2,
    false
  );
  publisherCanvasCtx.fill();
}

function updateDotPosition() {
  if (
    currentDotPosY === publisherCanvas.height / 2 - dotRadius ||
    currentDotPosY === dotRadius
  ) {
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
    publisherStats.innerText =
      'Publishing ' +
      Math.round((sinceStart / 1000) * 100) / 100 +
      ' seconds @ ' +
      Math.round((1000 / (sinceStart / ++frameCount)) * 100) / 100 +
      ' fps';
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