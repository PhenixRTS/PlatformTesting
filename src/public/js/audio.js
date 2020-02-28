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

/* global constants */

(function() {
  const {audioLag, generateFrequencies} = constants;
  let audioContext;
  let mediaRecorder;
  let masterGain;
  let chunks = [];
  const frequencies = generateFrequencies(audioLag.initFrequency);

  // eslint-disable-next-line padding-line-between-statements
  const recordMedia = () => {
    mediaRecorder.ondataavailable = event => {
      chunks.push(event.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, {type: 'audio/ogg; codecs=opus'});
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');

      document.body.appendChild(a);
      a.style = 'display: none';
      a.download = 'audio-lag';
      a.href = url;

      a.click();
      window.URL.revokeObjectURL(url);
    };
  };

  const playSignal = (f) => {
    let oscillator = audioContext.createOscillator();
    oscillator.type = 'square';
    oscillator.frequency.value = f;

    oscillator.connect(masterGain);
    oscillator.start();

    setTimeout(() => {
      oscillator.stop();

      if (frequencies.length === 0) {
        mediaRecorder.stop();

        return;
      }

      const currFrequency = frequencies.shift();
      setTimeout(() => {
        playSignal(currFrequency);
      }, audioLag.timeBetween);
    }, audioLag.signalDuration);
  };

  const initialize = () => {
    audioContext =
      'webkitAudioContext' in window
        ? new window.webkitAudioContext()
        : new AudioContext();

    const destination = audioContext.createMediaStreamDestination();
    mediaRecorder = new MediaRecorder(destination.stream);

    mediaRecorder.start();
    recordMedia();

    masterGain = audioContext.createGain();
    masterGain.gain.value = 1.0;
    masterGain.connect(destination);

    const f = frequencies.shift();
    setTimeout(() => {
      playSignal(f);
    }, 500);
  };

  const newAudioBtn = document.getElementById('new-audio');
  newAudioBtn.addEventListener('click', () => {
    initialize();
  });
})();