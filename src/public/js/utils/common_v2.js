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

/* eslint-disable no-unused-vars */
/* global phenix, getUrlParams, log, showSubscriberError */

const commonLoadedEvent = new Event('common_loaded');

let channel;

document.dispatchEvent(commonLoadedEvent);

function joinChannel(videoElement, channelAlias, joinChannelCallback, subscriberCallback) {
  const edgeToken = new URLSearchParams(location.search).get('edgeToken');

  channel = phenix.Channels.createChannel({
    videoElement,
    token: edgeToken
  });

  subscribeToChannelEvents();
  subscriberCallback(null, undefined);
}

function subscribeToChannelEvents() {
  // Browser may refuse video playback without video being muted
  channel.autoMuted.subscribe(autoMuted => {
    if (autoMuted) {
      log('Playback was auto-muted by browser. Please use user action to initiate `channel.unmute()`');
    }
  });

  // Browser may completely refuse video playback, e.g. low battery
  // Note on ios you need to use videoElelemnt.onplay / no custom play button
  channel.autoPaused.subscribe(autoPaused => {
    if (autoPaused) {
      log('Playback was auto-paused by browser. Please use user action to initiate `channel.play()`');
    }
  });

  // Detect if the client failed to authorize
  channel.authorized.subscribe(authorized => {
    log(`Authorized: ${authorized}`);

    if (!authorized) {
      showSubscriberError('Failed to authorize');
    }
  });

  // Detect if the channel has video
  channel.standby.subscribe(standby => {
    if (standby) {
      log('channel has no video');
    } else {
      log(`[Stream received] ${Date.now()}`);
    }
  });

  // Detect if the client is unable to connect
  // This could happen if the DNS or network is changing or impaired
  channel.online.subscribe(online => {
    if (!online) {
      log('client is unable to connect');
    }
  });
}

function rejoinChannel(videoElement, alias, joinChannelCallback, subscriberCallback) {
  joinChannel(videoElement);
}

function initialiseAdminProxyClient(backendUri, isBackendPcastUri) {
  // TODO: - Implement this
}

function startStatsLogging(stream) {
  setInterval(() => {
    if (phenix.SDK.browserDetector.browserName === 'Chrome' && phenix.SDK.browserDetector.browserMajorVersion <= 66) {
      /* eslint-disable @typescript-eslint/no-use-before-define */
      channelGetStatsLegacy();
      /* eslint-enable */

      return;
    }

    if (channel.peerConnection.value) {
      channel.peerConnection.value.getStats().then((stats) => {
        const rtcStats = [];

        if (stats) {
          stats.forEach(i => {
            if (i.type === 'inbound-rtp') {
              rtcStats.push(i);
            }
          });

          logStats(rtcStats);
        }
      });
    }
  }, 1000);
}

// Usage of the legacy method for the Chrome v66 and lower
function channelGetStatsLegacy() {
  channel.peerConnection.value.getStatsLegacy().then((stats) => {
    const rtcStats = [];

    stats.result().forEach((report) => {
      if (report.type === 'ssrc') {
        const reportObj = {};

        report.names().forEach((name) => {
          reportObj[name] = report.stat(name);
        });
        rtcStats.push(reportObj);
      }
    });

    logStats(rtcStats);
  });
}

function logStats(stats) {
  stats.forEach(stat => {
    log(`[Media Stream Stats] ${JSON.stringify({
      timestamp: Date.now(),
      stat
    })}`);
  });
}

// eslint-disable-next-line no-unused-vars
async function publishTo(channelAlias, stream, backendUri, pcastUri, channelName, publishCallback, createChannel) {
  log(`Publisher backend uri: ${backendUri}`);
  log(`Publisher PCast uri: ${pcastUri}`);

  // TODO: - Implement this
}

// eslint-disable-next-line no-unused-vars
async function validateThatThereIsNoOtherPublishers(backendUri, successCallback) {
  // TODO: - Implement this
}

// eslint-disable-next-line no-unused-vars
function stopPublisher(publisherChannelExpress) {
  // TODO: - Implement this
}