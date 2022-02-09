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

import {Selector} from 'testcafe';

import config from '../../config.js';
import ChannelPage from '../models/channel-page.js';
import reporter from '../models/reporters/sync-watch-reporter.js';
import moment from 'moment';
import Logger from '../../scripts/logger.js';

const common = require('./common');
const page = new ChannelPage();
const reportStartTime = moment.utc().toISOString();
const logger = new Logger('Channel sync watch test script');
let createdChannel;

global.fixture(`Channel sync watch test${config.rtmpPushArgs.rtmpPushFile === '' ? '' : ' with RTMP push'}`)
  .page(`${config.localServerAddress}:${config.args.localServerPort}/syncwatch${config.testPageUrlAttributes}`);

test(`Publish to channel for [${config.args.testRuntime}] and assert sync watch of video and audio`, async t => {
  const isRtmpPush = config.rtmpPushArgs.rtmpPushFile !== '';

  createdChannel = await common.createOrGetChannel(t);
  console.log(`Did create or got channel [${createdChannel.channelId}]`);

  if (isRtmpPush) {
    createdChannel = await common.initRtmpPush('syncwatch_test', createdChannel);
  }

  await common.subscribeFromClient(createdChannel.channelId);

  const publisherCount = await common.waitForPublisher(createdChannel.channelId);

  const publishersStreamIds = await common.getPresentersStreamIds(createdChannel.channelId);

  await t
    .expect(publisherCount)
    .eql(1, 'Failed to join the channel: publisher not ready');

  await t
    .expect(publishersStreamIds.length)
    .eql(1, `More than one publisher stream id [${publishersStreamIds}]`);

  logger.log(`Publisher stream id: [${publishersStreamIds[0]}]`);

  await t
    .expect(Selector('video').withAttribute('id', 'publisherVideoContainer').exists).ok()
    .expect(Selector('video').withAttribute('id', 'subscriberOneVideoContainer').exists).ok()
    .expect(Selector('video').withAttribute('id', 'subscriberTwoVideoContainer').exists).ok()
    .expect(Selector('#publisherAuthError').innerText).notContains('Error', 'Got an error on publisher authentication')
    .expect(Selector('#publisherError').innerText).notContains('error', 'Got an error in publish callback', {timeout: 35 * 1000})
    .expect(Selector('#subscriberOneError').innerText).notContains('Error', 'Got an error in subscriber one callback', {timeout: 35 * 1000})
    .expect(Selector('#subscriberTwoError').innerText).notContains('Error', 'Got an error in subscriber two callback', {timeout: 35 * 1000});

  await common.monitorStream(t, 'subscriberOneCanvas');
  await common.monitorStream(t, 'subscriberTwoCanvas');

  page.stats = await reporter.CollectMediaChanges();

  await page.asserts.assertSyncWatch();

  await page.asserts.reportAssertionResults();

  const viewingReport = await common.generateViewingReport('RealTime', createdChannel.channelId, reportStartTime);

  viewingReport.forEach((subscriber, index) => logger.log(`Subscriber${index + 1} stream id: [${subscriber.StreamId}]`));

  await t
    .expect(viewingReport.length).eql(2, `Expected [2] users that viewed published video but were [${viewingReport.length}]`);

  const publishingReport = await common.generatePublishingReport(createdChannel.channelId, reportStartTime);

  await t
    .expect(publishingReport.length).eql(1, `Expected [1] published stream in report but was [${publishingReport.length}]`);

  await t
    .expect(publishingReport[0].StreamId).eql(publishersStreamIds[0],
      `Expected streamId from report [${publishingReport[0].StreamId}] to be equal to presenter streamId [${publishersStreamIds[0]}] but it was not`);

  await t
    .expect(publishingReport[0].IngestStreamEndedReason).eql('',
      `[IngestStreamEndedReason] must be an empty string but was [${publishingReport[0].IngestStreamEndedReason}]`);
}).after(async t => {
  await common.finishAndReport(__filename, page, t, createdChannel);
});