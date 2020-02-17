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

import uaParser from 'ua-parser-js';

import config from '../../config.js';
import ChannelPage from '../models/channel-page.js';
import reporter from '../models/reporters/quality-reporter.js';

const common = require('./common');
const page = new ChannelPage();

global.fixture('Channel quality test')
  .page(`${config.localServerAddress}:${config.args.localServerPort}/${config.testPageUrlAttributes}`);

test(`Measure channel for ${config.args.testRuntime} and assert quality of video and audio`, async t => {
  const ua = await common.getUA();

  await t
    .wait(3000)
    .expect(page.videoEl.exists).ok()
    .expect(page.offlineTitle.exists).notOk()
    .wait(config.args.testRuntimeMs);

  page.browser = uaParser(ua).browser;
  page.stats = await reporter.CollectMediaStreamStats();
  page.meanVideoStats = await reporter.GetMeanVideoStats(page.stats);
  page.meanAudioStats = await reporter.GetMeanAudioStats(page.stats);

  await page.asserts.assertKPIs();
  await page.asserts.assertVideoQuality();
  await page.asserts.assertAudioQuality();
}).after(async t => {
  await common.finishAndReport(__filename, t.ctx.testFailed, page, t);
});