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

/* eslint-disable no-unused-vars */

const {exec} = require('child_process');
const QRCode = require('qrcode');
const path = require('path');
const ps = require('ps-node');

const config = require('../../config.js');
const Logger = require('../../scripts/logger.js');
const constants = require('../../shared/constants.js');

const logger = new Logger('RTMP Push');

let qrGenerationInterval = null;

async function createOnDemandRtmpPush(file, region, channel, duration) {
  logger.log(`Creating on-demand stream (${duration} s)`);

  await startRtmpPush('', file, region, channel, 'multi-bitrate,streaming,on-demand,hd');

  setTimeout(() => {
    stopRtmpPush();
  }, duration);
}

async function startRtmpPush(testType, file, region, channel, capabilities) {
  const link = `rtmp://${region}.phenixrts.com:80/ingest/${channel.streamKey};capabilities=${capabilities}`;
  logger.log(`Generated link: ${link}`);

  const timestampFile = path.join(config.reportsPath, 'qr-timestamp.png');
  const newTimestamp = path.join(config.reportsPath, 'qr-timestamp2.png');

  generateQRTimestampFile(timestampFile, Date.now().toString());

  qrGenerationInterval = setInterval(() => {
    generateQRTimestampFile(newTimestamp, Date.now().toString()).then(() => {
      exec(`mv ${newTimestamp} ${timestampFile}`);
    });
  }, 100);

  switch (testType) {
    case 'lag_test':
      exec(
        `ffmpeg \
        -re -i ${file} \
        -pattern_type glob \
        -f image2 \
        -loop 1 \
        -i ${timestampFile} \
        -filter_complex "[0:v][1:v] overlay=0:0" \
        -tune zerolatency \
        -max_muxing_queue_size 1024 \
        -c:a aac \
        -c:v h264 \
        -f flv "${link}" > test/reports/ff.txt 2>&1`,
        err => {
          logFfmpegError(err);
        }
      );
      break;
    default:
      exec(
        `ffmpeg -re -i ${file} -c:a copy -c:v copy -f flv "${link}" > test/reports/ff.txt 2>&1`,
        err => {
          logFfmpegError(err);
        }
      );
  }
}

function logFfmpegError(error) {
  const moreInformationMessage = `See ${path.join(config.reportsPath, 'ff.txt')} for more information`;

  if (error) {
    if (error.code == 255) {
      console.log(`RTMP push stopped. ${moreInformationMessage}`);
    } else {
      console.log(`RTMP push failed. ${moreInformationMessage}`);
      process.exit(1);
    }
  }
}

async function generateQRTimestampFile(fileName, content) {
  const {width, height} = constants.qrCode;

  try {
    await QRCode.toFile(fileName, content, { width, height });
    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
};

async function stopRtmpPush() {
  clearInterval(qrGenerationInterval);

  ps.lookup({command: 'ffmpeg'}, (err, results) => {
    if (err) {
      throw new Error(err);
    }

    for (const process of results) {
      if (process) {
        ps.kill(process.pid, 'SIGTERM', (err) => {
          if (err) {
            throw new Error(err);
          }

          logger.log(`Process ${process.pid} has been stopped`);
        });
      }
    }
  });
}

module.exports = {
  createOnDemandRtmpPush,
  startRtmpPush,
  stopRtmpPush
};
