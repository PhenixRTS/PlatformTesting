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

/* global error, getUrlParams, getChannelUri, log, sdk */

let roomExpress = null;
let statsCollectingInterval = null;
let streams = {};

const videoList = document.getElementById('videoList');
const canvasList = document.getElementById('canvasList');

document.addEventListener('DOMContentLoaded', () => {
  log(`[Url loaded] ${Date.now()}`);

  const roomAlias = getUrlParams('roomAlias');

  roomExpress = initRoom(roomAlias);

  joinRoom(roomAlias);
});

function initRoom(alias) {
  const backendUri = getUrlParams('backendUri');
  const pcastUri = getUrlParams('pcastUri');

  const featuresParam = getUrlParams('features');
  const features = featuresParam === undefined ? [] : featuresParam.split(',');

  const isBackendPcastUri =
    backendUri.substring(backendUri.lastIndexOf('/') + 1) === 'pcast';
  const backendUriWithPcast = isBackendPcastUri ? backendUri : `${backendUri}/pcast`;

  const adminApiProxyClient = new sdk.net.AdminApiProxyClient();
  adminApiProxyClient.setBackendUri(backendUriWithPcast);

  const roomExpress = new sdk.express.RoomExpress({
    adminApiProxyClient,
    features,
    disableConsoleLogging: true,
    uri: pcastUri
  });

  log(`Backend uri: ${backendUriWithPcast}`);
  log(`PCast uri: ${pcastUri}`);

  log(`Joining room ${getChannelUri(backendUri, isBackendPcastUri, alias)}`);

  return roomExpress;
}

function joinRoom(roomAlias) {
  if (roomExpress === null) {
    return;
  }

  roomExpress.joinRoom(
    {
      alias: roomAlias,
      role: 'Audience'
    },
    joinRoomCallback,
    membersChangedCallback
  );
}

function joinRoomCallback(err, response) {
  const {status} = response;

  if (err) {
    log(`Failed to join room! Got error: ${err.message}`);
    error(err);
  }

  if (status === 'room-not-found') {
    console.warn('Room not found!');
  }

  if (status !== 'ok' && response.status !== 'ended') {
    log('Unable to join room, got status: ' + response.status);
    error(err);
  }

  if (status === 'ok' && response.roomService) {
    log('Successfully joined to the room');
  }
}

function membersChangedCallback(members) {
  const failIfMemberHasNoStream = getUrlParams('failIfMemberHasNoStream') === 'true';
  const targetScreen = getUrlParams('screenName');

  if (members.length === 0) {
    setClientMessage('Waiting for members to join');
  } else {
    setClientMessage(`${members.length} members in room`);
  }

  members.forEach(member => {
    const screenName = member.getObservableScreenName().getValue();
    const sessionID = member.getSessionId();
    const memberID = `screenName_${screenName}_sessionID_${sessionID}`;

    if (targetScreen !== '' && targetScreen !== screenName) {
      return;
    }

    if (streams[memberID]) {
      return;
    }

    const newMember = createVideo(memberID, screenName);

    if (newMember === null) {
      return;
    }

    const memberStream = member.getObservableStreams().getValue()[0];
    const options = {videoElement: document.getElementById(memberID)};

    roomExpress.subscribeToMemberStream(
      memberStream,
      options,
      (err, response) => {
        const {mediaStream, status} = response;

        if (err) {
          log(
            `Failed to subscribe to ${screenName} (session ID: ${sessionID}) stream! Got error: ${err.message}`
          );
          error(err);
        }

        if (status !== 'ok') {
          const newStatusMsg = `Failed to subscribe to ${screenName} (session ID: ${sessionID}) stream! Got status: ${status}`;

          error(newStatusMsg);
        }

        if (!mediaStream && failIfMemberHasNoStream) {
          const msg = `Error: ${screenName} (session ID: ${sessionID}) has no media stream!`;
          document.getElementById('roomError').innerHTML = msg;

          error(msg);
        }

        if (status === 'ok' && mediaStream) {
          log(`[Stream received] [memberID:${memberID}] ${Date.now()}`);
          streams[memberID] = mediaStream;
        }
      }
    );
  });

  if (!statsCollectingInterval) {
    startStatsLogging();
  }
}

function startStatsLogging() {
  statsCollectingInterval = setInterval(() => {
    for (const memberID in streams) {
      streams[memberID].getStats(stats =>
        getStatsCallback(stats, memberID)
      );
    }
  }, 1000);
}

function getStatsCallback(stats, memberID) {
  stats.forEach(stat => {
    log(`[Media Stream Stats] [memberID:${memberID}] ${JSON.stringify(stat)}`);
  });
}

function createVideo(videoId, screenName) {
  if (document.getElementById(videoId)) {
    return null;
  }

  const container = document.createElement('div');
  const nameElement = document.createElement('h3');
  const videoElement = document.createElement('video');
  const canvasElement = document.createElement('canvas');

  nameElement.innerHTML = screenName;

  canvasElement.setAttribute('id', `${videoId}-canvas`);

  videoElement.setAttribute('id', videoId);
  videoElement.setAttribute('autoplay', '');
  videoElement.setAttribute('playsline', '');

  videoElement.onpause = function() {
    setTimeout(() => {
      videoElement.play();
    }, 10);
  };

  container.append(nameElement);
  container.append(videoElement);

  videoList.append(container);
  canvasList.append(canvasElement);

  return videoElement;
}

function setClientMessage(message) {
  const clientMessageElement = document.getElementById('clientMessage');

  clientMessageElement.innerHTML = message;
}