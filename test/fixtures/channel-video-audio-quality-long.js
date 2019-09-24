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

import ChannelPage from '../models/channel-page.js';
import Helper from '../models/helper.js';
import config from '../../config.js';
import {ok} from 'assert';

const page = new ChannelPage();
const helper = new Helper();

global.fixture('Clock channel video test')
  .page(config.testPageUrl);

test('Measure channel 5 minutes and assert mean video and audio metrics', async t => {
  await t
    .wait(1000 * 60 * 5)
    .expect(page.videoEl.exists).ok()
    .expect(page.offlineTitle.exists).notOk();

  page.stats = await helper.CollectMediaStreamStats();
  page.meanVideoStats = await helper.GetMeanVideoStats(page.stats);
  page.meanAudioStats = await helper.GetMeanAudioStats(page.stats);

  ok(page.stats.video !== [], 'No video stats collected!');
  ok(page.stats.audio !== [], 'No audio stats collected!');

  helper.assert('Video mean delay', page.meanVideoStats.currentDelay, page.meanVideoStats.targetDelay, 'lte');
  helper.assert('Audio mean jitter', page.meanAudioStats.jitter, config.assertAudioJitterBelow, 'lt');
  helper.assert('Audio mean bitrate', page.meanAudioStats.bitrateMean, config.assertAudioBitrateAbove, 'gte');
}).after(async t => {
  helper.SaveToFile(__filename, t.ctx.passed ? 'PASS' : 'FAIL', await helper.CreateTestReport(page)); // eslint-disable-line no-undef
});