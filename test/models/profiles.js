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

const path = require('path');
const _ = require('lodash');

const defaultProfiles = require('../profiles/default.js');
const {exitWithErrorMessage} = require('./console-messaging.js');

function prepareProfiles(rootDirectory, argv, args) {
  if (argv.profileFile) {
    const customProfile = require(path.join(rootDirectory, argv.profileFile));

    if (customProfile.videoProfile) {
      args.videoProfile = inheritanceHandled(rootDirectory, 'videoProfile', customProfile);
      validateProfile(argv.profileFile, 'video', args.videoProfile, customProfile.videoProfile);
    }

    if (customProfile.audioProfile) {
      args.audioProfile = inheritanceHandled(rootDirectory, 'audioProfile', customProfile);
      validateProfile(argv.profileFile, 'audio', args.audioProfile, customProfile.audioProfile);
    }

    if (customProfile.chatProfile) {
      args.chatProfile = inheritanceHandled(rootDirectory, 'chatProfile', customProfile);
      validateProfile(argv.profileFile, 'chat', args.chatProfile, customProfile.chatProfile);
    }
  }

  if (argv.video) {
    Object.keys(argv.video).forEach(key => {
      if (args.videoProfile[key] === undefined) {
        exitWithErrorMessage(
          `Error: unsupported argument override - key '${key}' does not exist on video profile!` +
            `\n\nAvailable keys:\n ${JSON.stringify(
              Object.keys(defaultProfiles.videoProfile),
              undefined,
              2
            )}`
        );
      }

      if (
        key === 'interframeDelayThresholds' ||
        key === 'minFrameRate' ||
        key === 'maxFrameRate'
      ) {
        Object.keys(argv.video[key]).forEach((index) => {
          if (args.videoProfile[key][index]) {
            _.merge(args.videoProfile[key][index], argv.video[key][index]);
          } else {
            args.videoProfile[key].push(parseJsonIfPossible(argv.video[key][index]));
          }
        });
      } else {
        args.videoProfile[key] = parseJsonIfPossible(argv.video[key]);
      }
    });
  }

  if (argv.audio) {
    Object.keys(argv.audio).forEach((key) => {
      if (args.audioProfile[key] === undefined) {
        exitWithErrorMessage(
          `Error: unsupported argument override - key '${key}' does not exist on audio profile!` +
          `\n\nAvailable keys:\n ${JSON.stringify(Object.keys(defaultProfiles.audioProfile), undefined, 2)}`
        );
      }

      if (key === 'audioDelayThresholds') {
        Object.keys(argv.audio[key]).forEach((index) => {
          if (args.audioProfile[key][index]) {
            _.merge(args.audioProfile[key][index], argv.audio[key][index]);
          } else {
            args.audioProfile[key].push(parseJsonIfPossible(argv.audio[key][index]));
          }
        });
      } else {
        args.audioProfile[key] = parseJsonIfPossible(argv.audio[key]);
      }
    });
  }

  if (argv.chat) {
    Object.keys(argv.chat).forEach((key) => {
      if (args.chatProfile[key] === undefined) {
        exitWithErrorMessage(
          `Error: unsupported argument override - key [${key}] does not exist on chat profile!` +
          `\n\nAvailable keys:\n ${JSON.stringify(Object.keys(defaultProfiles.chatProfile), undefined, 2)}`
        );
      }

      if (argv.mode !== key){
        exitWithErrorMessage(
          `Error: unsupported argument override - key [${key}] does not match given mode [${argv.mode}]!`
        );
      }

      const chatObject = argv.mode === 'receive' ? argv.chat.receive : argv.chat.send;
      const chatProfileObject = argv.mode === 'receive' ? args.chatProfile.receive : args.chatProfile.send;
      const chatProfileKeys = argv.mode === 'receive' ? defaultProfiles.chatProfile.receive : defaultProfiles.chatProfile.send;

      Object.keys(chatObject).forEach((key) => {
        if (chatProfileObject[key] === undefined) {
          exitWithErrorMessage(
            `Error: unsupported argument override - key [${key}] does not exist on chat [${argv.mode}] profile!` +
            `\n\nAvailable keys:\n ${JSON.stringify(Object.keys(chatProfileKeys), undefined, 2)}`
          );
        }

        chatProfileObject[key] = parseJsonIfPossible(chatObject[key]);
      });
    });
  }
}

function inheritanceHandled(rootDirectory, key, profile) {
  if (profile[key].inherits && !_.isNull(profile[key].inherits)) {
    const inheritedProfile = require(path.join(rootDirectory, profile[key].inherits));
    _.merge(inheritedProfile[key], profile[key]);

    return inheritedProfile[key];
  }

  return profile[key];
}

function validateProfile(profileFile, type, defaultProfile, customProfile) {
  const validKeys = Object.keys(defaultProfile).sort();
  const customProfileKeys = Object.keys(customProfile).sort();
  const invalidKeys = customProfileKeys.filter(x => !validKeys.includes(x));

  if (invalidKeys.length > 0) {
    exitWithErrorMessage(`Provided custom ${type} profile '${profileFile}' contains invalid keys ${JSON.stringify(invalidKeys)}.\nSee 'test/profiles/default.js' for all valid keys.`);
  }
}

function parseJsonIfPossible(value) {
  let json = value;
  try {
    json = JSON.parse(value);
  } catch {
    return value;
  }

  return json;
}

module.exports = {prepareProfiles};