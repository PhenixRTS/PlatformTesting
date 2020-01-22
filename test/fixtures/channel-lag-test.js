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

import {ClientFunction, Selector} from 'testcafe';
import uaParser from 'ua-parser-js';
import ChannelPage from '../models/channel-page.js';
import config from '../../config.js';
import persistence from '../models/persistence.js';
import reporter from '../models/reporters/lag-reporter.js';
import {ok} from 'assert';

const rtmpPush = require('../models/rtmp-push.js');
const pcastApi = require('../models/pcastApi.js');
const page = new ChannelPage();
let createdChannelId;

global.fixture('Channel lag test')
  .page(`${config.localServerAddress}:${config.args.localServerPort}/lag${config.testPageUrlAttributes}`);

const getUA = ClientFunction(() => navigator.userAgent);

test(`Publish to channel for ${config.args.testRuntime} and assert lag of video/audio`, async t => {
  const ua = await getUA();

  if (config.args.rtmpPushFile !== '') {
    let channel = await pcastApi.createChannel(config.channelAlias);
    ok(channel !== undefined, 'Could not create channel for RTMP Push');
    createdChannelId = channel.channelId;
    rtmpPush.startRtmpPush(config.args.rtmpPushFile, config.args.region, channel, config.args.capabilities);
  }

  await t
    .expect(Selector('video').withAttribute('id', 'publisherVideoContainer').exists).ok()
    .expect(Selector('video').withAttribute('id', 'subscriberVideoContainer').exists).ok()
    .wait(35 * 1000)
    .expect(Selector('#publisherError').innerText).notContains('error', 'Got an error in publish callback')
    .wait(config.args.testRuntimeMs);

  page.browser = uaParser(ua).browser;
  page.stats = await reporter.CollectMediaChanges();

  await page.asserts.assertVideoLag();
  await page.asserts.assertAudioLag();
}).after(async t => {
  if (createdChannelId !== undefined) {
    rtmpPush.stopRtmpPush();
    await pcastApi.deleteChannel(createdChannelId);
    console.log(`Stopped RTMP Push and deleted created channel with id ${createdChannelId}`);
  }

  persistence.saveToFile(__filename, t.ctx.testFailed ? 'FAIL' : 'PASS', await reporter.CreateTestReport(page));

  if (config.args.saveConsoleLogs === 'true') {
    persistence.saveToFile(`${page.browser.name}-console-logs`, '', await reporter.CreateConsoleDump());
  }
});