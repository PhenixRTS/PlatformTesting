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

/* global log, joinChannel, getUrlParams, rgbToHex, publishTo, startListeningToSubscriberAudioChanges */

var publisherCanvas;
var publisherCanvasCtx;
var subscriberCanvas;
var subscriberCanvasCtx;
var channelAlias = 'ChannelLagTest';
var channelName = 'Lag test';
var audioSampleRate = 44100;
var audioFFTSize = 512;

var publisher;
var publisherBackendUri = getUrlParams('publisherBackendUri');
var publisherPcastUri = getUrlParams('publisherPcastUri');
var publisherVideoEl;

var subscriberVideoEl;
var subscriberStream;

var subscriberOscilloscopeEl;
var subscriberFrequencyGraphEl;
var subscriberFrequencyValueEl;
var subscriberAudioAnalyser;
var subscriberAudioTimeDataArray;
var subscriberAudioFrequencyDataArray;
var subscriberCanvasColorVal;
var previousSubscriberColor = {
  r: 0,
  g: 0,
  b: 0
};

var testMediaStream;
var canvasColorArr = ['#ffff00', '#009900', '#ff0000', '#0000ff', '#000000'];
var nextCanvasColor = canvasColorArr[0];
var audioFrequencies = [200, 400, 600, 800, 1000, 1200, 1400, 1500, 1700, 1900, 2100];
var nextFrequencyIndex = 0;

var audioCtx;
var oscillator;

var mediaChangeInterval = 300;
var mediaListenInterval = 60;

document.addEventListener('DOMContentLoaded', () => {
  log(`[Url loaded] ${Date.now()}`);
  prepare();
});

function prepare() {
  publisherVideoEl = document.getElementById('publisherVideoContainer');
  subscriberVideoEl = document.getElementById('subscriberVideoContainer');
  subscriberOscilloscopeEl = document.getElementById('subscriberOscilloscope');
  subscriberFrequencyGraphEl = document.getElementById('subscriberFreqGraph');
  subscriberFrequencyValueEl = document.getElementById('subscriberFreqValue');
  publisherCanvas = document.getElementById('publisherCanvas');
  subscriberCanvas = document.getElementById('subscriberCanvas');
  subscriberCanvasCtx = subscriberCanvas.getContext('2d');
  subscriberCanvasColorVal = document.getElementById('subscriberCanvasColorVal');

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
  publish();

  const publisherRecordingMs = getUrlParams('publisherRecordingMs');
  if (publisherRecordingMs > 0) {
    setTimeout(() => {
      startMultimediaRecordingFor(publisherRecordingMs, testMediaStream);
    }, 5000);
  }
}

function changeAudioTone() {
  setInterval(() => {
    oscillator.frequency.setValueAtTime(audioFrequencies[nextFrequencyIndex], audioCtx.currentTime);
    log(`[Publisher Audio] {"timestamp": ${Date.now()}, "frequency": ${audioFrequencies[nextFrequencyIndex]}}`);
    setNextAudioFrequencyIndex();
  }, mediaChangeInterval);
}

function logSubscriberAudioChanges(timestamp, frequency) {
  log(`[Subscriber Audio] {"timestamp": ${timestamp}, "frequency": ${frequency}}`);
  subscriberFrequencyValueEl.innerHTML = `Got ${frequency} Hz`;
}

function updateCanvasColor() {
  setInterval(() => {
    publisherCanvasCtx.fillStyle = nextCanvasColor;
    publisherCanvasCtx.fillRect(0, 0, publisherCanvas.width, publisherCanvas.height);
    publisherCanvasCtx.fill();

    var imgData = publisherCanvasCtx.getImageData(10, 10, 1, 1).data;
    log(`[Publisher Video] {"timestamp": ${Date.now()}, "color": {"r": ${imgData[0]}, "g": ${imgData[1]}, "b": ${imgData[2]}}}`);
    setNextRandomCanvasColor();
  }, mediaChangeInterval);
}

function logSubscriberVideoChange(timestamp, color) {
  log(`[Subscriber Video] {"timestamp": ${timestamp}, "color": {"r": ${color.r}, "g": ${color.g}, "b": ${color.b}}}`);
  subscriberCanvasColorVal.innerHTML = `Got: HEX ${rgbToHex(color)} | RGB ${JSON.stringify(color)}`;
}

function listenToSubscriberVideoChanges() {
  var imgData = subscriberCanvasCtx.getImageData(10, 10, 1, 1).data;
  var color = {
    r: imgData[0],
    g: imgData[1],
    b: imgData[2]
  };

  if (color.r !== previousSubscriberColor.r || color.g !== previousSubscriberColor.g || color.b !== previousSubscriberColor.b) {
    logSubscriberVideoChange(Date.now(), color);
    previousSubscriberColor = color;
  }
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

// MARK: - Publisher

function publish() {
  publishTo(channelAlias, testMediaStream, publisherBackendUri, publisherPcastUri, channelName, publishCallback);
}

function publishCallback(error, response) {
  if (error) {
    log('PublishCallback returned error=' + error.message);
    stopPublisher();

    throw error;
  }

  if (response.status !== 'ok' && response.status !== 'ended' && response.status !== 'stream-ended') {
    stopPublisher();

    throw new Error(response.status);
  }

  if (response.status === 'ok') {
    publisher = response.publisher;
    subscribe();
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
  joinChannel(
    subscriberVideoEl,
    channelAlias,
    joinChannelCallback,
    subscriberCallback
  );
}

function joinChannelCallback(error, response) {
  if (error) {
    log('Failed to join channel!');
    log(error);
    error(error.message);
  }

  if (response.status === 'room-not-found') {
    console.warn('Room not found');
  } else if (response.status !== 'ok') {
    error(error.message);
  }

  if (response.status === 'ok' && response.channelService) {
    log('Successfully joined channel');
  }
}

function subscriberCallback(error, response) {
  if (error) {
    error(error.message);
  }

  if (response.status === 'no-stream-playing') {
    console.warn('No stream playing');
  } else if (response.status !== 'ok') {
    error(error.message);
  }

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

  prepareAudioAnalyzer();

  drawToCanvas();
  drawAudioVisualisations();
}

function drawToCanvas() {
  subscriberCanvasCtx.clearRect(0, 0, subscriberCanvas.width, subscriberCanvas.height);
  subscriberCanvasCtx.drawImage(subscriberVideoEl, 0, 0, subscriberVideoEl.videoWidth, subscriberVideoEl.videoHeight);
  listenToSubscriberVideoChanges();

  requestAnimationFrame(drawToCanvas);
}

function prepareAudioAnalyzer() {
  var subscriberAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
  subscriberAudioCtx.sampleRate = audioSampleRate;

  var source = subscriberAudioCtx.createMediaStreamSource(subscriberStream.Zo);
  subscriberAudioAnalyser = subscriberAudioCtx.createAnalyser();
  source.connect(subscriberAudioAnalyser);
  subscriberAudioAnalyser.fftSize = audioFFTSize;

  startListeningToSubscriberAudioChanges(subscriberAudioAnalyser, mediaListenInterval, audioSampleRate, ((frequency) => {
    logSubscriberAudioChanges(Date.now(), frequency);
  }));

  subscriberAudioTimeDataArray = new Uint8Array(subscriberAudioAnalyser.frequencyBinCount);
  subscriberAudioFrequencyDataArray = new Float32Array(subscriberAudioAnalyser.frequencyBinCount);
}

// MARK: - Audio visualisation

function drawAudioVisualisations() {
  requestAnimationFrame(drawAudioVisualisations);

  subscriberAudioAnalyser.getByteTimeDomainData(subscriberAudioTimeDataArray);

  var canvasOscCtx = subscriberOscilloscopeEl.getContext('2d');
  canvasOscCtx.fillStyle = 'rgb(200, 200, 200)';
  canvasOscCtx.fillRect(0, 0, 500, 300);
  drawLine(subscriberOscilloscopeEl, subscriberAudioTimeDataArray);

  subscriberAudioAnalyser.getFloatFrequencyData(subscriberAudioFrequencyDataArray);

  var canvasFreqCtx = subscriberFrequencyGraphEl.getContext('2d');
  canvasFreqCtx.fillStyle = 'rgb(200, 200, 200)';
  canvasFreqCtx.fillRect(0, 0, 500, 300);
  drawBars(subscriberFrequencyGraphEl, subscriberAudioFrequencyDataArray);
}

function drawBars(canvasEl, dataArray) {
  var canvasCtx = canvasEl.getContext('2d');
  var barWidth = (canvasEl.width / subscriberAudioAnalyser.frequencyBinCount) * 2.5;
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
  var canvasCtx = canvasEl.getContext('2d');
  canvasCtx.lineWidth = 2;
  canvasCtx.strokeStyle = 'rgb(0, 0, 0)';
  canvasCtx.beginPath();

  var sliceWidth = canvasEl.width / subscriberAudioAnalyser.frequencyBinCount;
  var x = 0;

  for (var i = 0; i < subscriberAudioAnalyser.frequencyBinCount; i++) {
    var v = dataArray[i] / 128.0;
    var y = v * canvasEl.height / 2;

    i === 0 ? canvasCtx.moveTo(x, y) : canvasCtx.lineTo(x, y);
    x += sliceWidth;
  }

  canvasCtx.lineTo(publisherCanvas.width, publisherCanvas.height / 2);
  canvasCtx.stroke();
}