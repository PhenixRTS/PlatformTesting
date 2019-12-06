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
import reporter from '../models/reporters/sync-reporter.js';

const page = new ChannelPage();

global.fixture('Channel sync test')
  .page(`${config.localServerAddress}:${config.args.localServerPort}/sync${config.testPageUrlAttributes}`);

const getUA = ClientFunction(() => navigator.userAgent);

test(`Publish to channel for ${config.args.testRuntime} and assert sync of video and audio`, async t => {
  const ua = await getUA();

  await t
    .wait(3000)
    .expect(Selector('video').withAttribute('id', 'publisherVideoContainer').exists).ok()
    .expect(Selector('video').withAttribute('id', 'subscriberVideoContainer').exists).ok()
    .wait(config.args.testRuntimeMs);

  page.browser = uaParser(ua).browser;
  page.stats = await reporter.CollectMediaChanges();

  await page.asserts.assertSync();
}).after(async t => {
  persistence.saveToFile(__filename, t.ctx.testFailed ? 'FAIL' : 'PASS', await reporter.CreateTestReport(page));

  if (config.args.saveConsoleLogs === 'true') {
    persistence.saveToFile(`${page.browser.name}-console-logs`, '', await reporter.CreateConsoleDump());
  }
});