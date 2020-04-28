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

/* global log, getUrlParams, startMultimediaRecordingFor, publishTo, showPublisherMessage, subscribe, stopPublisher, error */

var canvasColorArr = ['#ffff00', '#009900', '#ff0000', '#0000ff', '#000000'];
var nextCanvasColor = canvasColorArr[0];
var audioFrequencies = [
  200,
  400,
  600,
  800,
  1000,
  1200,
  1400,
  1500,
  1700,
  1900,
  2100
];
var nextFrequencyIndex = 0;

var publisherCanvas;
var publisherCanvasCtx;

var publisher;
var publisherVideoEl;
var publisherChannelExpress;

var testMediaStream;

var audioCtx;
var oscillator;
var audioSampleRate = 44100;

const mediaChangeInterval = 300;
const initPublisher = () => {
  publisherVideoEl = document.getElementById('publisherVideoContainer');
  publisherCanvas = document.getElementById('publisherCanvas');

  publisherCanvas.width = 500;
  publisherCanvas.height = 500;
  publisherCanvasCtx = publisherCanvas.getContext('2d');

  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  audioCtx.sampleRate = audioSampleRate;
  oscillator = audioCtx.createOscillator(audioCtx.currentTime);
  oscillator.type = 'sine';

  oscillator.frequency.value = audioFrequencies[nextFrequencyIndex];
  oscillator.detune.value = 0;
  oscillator.start();

  var streamDestination = audioCtx.createMediaStreamDestination();
  var sourceNode = audioCtx.createMediaElementSource(publisherVideoEl);
  var volume = audioCtx.createGain();
  volume.gain.value = 0.5;
  volume.connect(streamDestination);
  oscillator.connect(volume);
  sourceNode.connect(streamDestination);
  sourceNode.connect(audioCtx.destination);

  var audioTrack = streamDestination.stream.getAudioTracks()[0];

  testMediaStream = publisherCanvas.captureStream();
  testMediaStream.addTrack(audioTrack);

  publisherVideoEl.srcObject = testMediaStream;

  updateCanvasColor();
  changeAudioTone();

  const publisherRecordingMs = getUrlParams('publisherRecordingMs');

  if (publisherRecordingMs > 0) {
    setTimeout(() => {
      startMultimediaRecordingFor(publisherRecordingMs, testMediaStream);
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

  publisherChannelExpress = await publishTo(
    channelAlias,
    testMediaStream,
    publisherBackendUri,
    publisherPcastUri,
    channelName,
    publishCallback
  );
}

function publishCallback(err, response) {
  if (err) {
    const message = `Error in publish callback - ${err.message}`;

    showPublisherMessage(`\n${message}\n`);
    error(message);
    stopPublisher(publisherChannelExpress);
  }

  if (
    response.status !== 'ok' &&
    response.status !== 'ended' &&
    response.status !== 'stream-ended'
  ) {
    const message = `Error in publish callback - got response status: ${response.status}`;

    showPublisherMessage(`\n${message}\n`);
    error(message);
    stopPublisher(publisherChannelExpress);
  }

  if (response.status === 'ok') {
    publisher = response.publisher;

    showPublisherMessage('\nPublished successfully!\n');
    subscribe();
  }
}

function updateCanvasColor() {
  setInterval(() => {
    publisherCanvasCtx.fillStyle = nextCanvasColor;
    publisherCanvasCtx.fillRect(
      0,
      0,
      publisherCanvas.width,
      publisherCanvas.height
    );
    publisherCanvasCtx.fill();

    var imgData = publisherCanvasCtx.getImageData(10, 10, 1, 1).data;

    log(
      `[Publisher Video] {"timestamp": ${Date.now()}, "color": {"r": ${
        imgData[0]
      }, "g": ${imgData[1]}, "b": ${imgData[2]}}}`
    );
    setNextRandomCanvasColor();
  }, mediaChangeInterval);
}

function changeAudioTone() {
  setInterval(() => {
    oscillator.frequency.setValueAtTime(
      audioFrequencies[nextFrequencyIndex],
      audioCtx.currentTime
    );

    log(
      `[Publisher Audio] {"timestamp": ${Date.now()}, "frequency": ${
        audioFrequencies[nextFrequencyIndex]
      }}`
    );
    setNextAudioFrequencyIndex();
  }, mediaChangeInterval);
}

function setNextRandomCanvasColor() {
  var nextColor = getRandomCanvasColor();

  while (nextColor === nextCanvasColor) {
    nextColor = getRandomCanvasColor();
  }

  nextCanvasColor = nextColor;
}

function setNextAudioFrequencyIndex() {
  nextFrequencyIndex++;

  if (nextFrequencyIndex === audioFrequencies.length) {
    nextFrequencyIndex = 0;
  }
}

function getRandomCanvasColor() {
  return canvasColorArr[Math.floor(Math.random() * canvasColorArr.length)];
}