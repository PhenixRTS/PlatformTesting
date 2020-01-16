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
const ps = require('ps-node');
const Logger = require('../../scripts/logger.js');
const logger = new Logger('RTMP Push');

async function createOnDemandRtmpPush(file, region, channel, duration) {
  logger.log(`Creating on-demand stream (${duration} s)`);

  await startRtmpPush(file, region, channel, 'multi-bitrate,streaming,on-demand,hd');

  setTimeout(() => {
    stopRtmpPush();
  }, duration);
}

async function startRtmpPush(file, region, channel, capabilities) {
  const link = `rtmp://${region}.phenixrts.com:80/ingest/${channel.streamKey};capabilities=${capabilities}`;
  logger.log(`Generated link: ${link}`);

  exec(`ffmpeg -re -i ${file} -c:a copy -c:v copy -f flv "${link}" > test/reports/ff.txt 2>&1`, err => {
    if (err) {
      logger.error('RTMP push failed/stopped. See ff.txt for more information');
      process.exit(1);
    }
  });
}

async function stopRtmpPush() {
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