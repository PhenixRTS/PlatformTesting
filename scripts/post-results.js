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

const request = require('request');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const chalk = require('chalk');
const argv = require('yargs')
  .help()
  .strict()
  .describe('destination', 'Where to post the results.')
  .describe('slack-channel', 'The Slack channel to post the results to.')
  .describe('slack-token', 'The Slack token.')
  .describe('full-results-url', 'The url to the job that created these results.')
  .default({
    destination: 'slack',
    'slack-channel': '',
    'slack-token': '',
    'full-results-url': ''
  })
  .example('npm run post-results -- --slack-channel=<your-slack-channel> --slack-token=<your-slack-token> --full-results-url=<path-to-results>')
  .epilog('Available destinations: slack')
  .argv;

async function postResults() {
  validateArguments();

  sendSlackMessage().then(response => {
    if (response.ok) {
      console.log(chalk.green(`Successfuly posted results\n`));
    } else {
      console.log(chalk.yellow(`There was a problem posting results! Response body [`, response.body, `]\n`));
    }

    const zipFilename = 'reports.zip';
    createZipArchive(zipFilename).then(() => {
      const readZipFileStream = fs.createReadStream(zipFilename);
      let threadTs;

      if (response.file.shares.private) {
        threadTs = response.file.shares.private[response.file.channels[0]][0].ts;
      } else {
        threadTs = response.file.shares.public[response.file.channels[0]][0].ts;
      }

      uploadFile({
        token: argv['slack-token'],
        title: 'Reports archive',
        channels: argv['slack-channel'],
        thread_ts: threadTs,
        filename: zipFilename,
        filetype: 'zip',
        file: readZipFileStream
      }, {'content-type': 'multipart/form-data'})
        .then(response => {
          if (response.ok) {
            console.log(chalk.green(`Successfuly uploaded file [${zipFilename}]\n`));
          } else {
            console.log(chalk.yellow(`There was a problem uploading [${zipFilename}]! Response body [`, response.body, `]\n`));
          }
        });
    });
  });
}

function sendSlackMessage() {
  return new Promise(resolve => {
    const reportFilename = 'post-results.json';
    const rawJson = fs.readFileSync(path.join('.', 'test', 'reports', reportFilename));
    const jsonReport = JSON.parse(rawJson);
    let message = `*${jsonReport.testStatus.toUpperCase()} ${jsonReport.testName} ${jsonReport.profileFile}*\n*${jsonReport.backendUri} ${jsonReport.channelAlias} ${jsonReport.browser} ${jsonReport.testRuntime}*\n\n`;

    if (argv['full-results-url'] !== '') {
      message += `Full Results: ${argv['full-results-url']}\n\n`;
    }

    message += `Passed: ${jsonReport.passedAssertions.length}\nFailed: ${jsonReport.failedAssertions.length} ${jsonReport.failedAssertions.length > 0 ? ':boom:' : ''}\nSkipped: ${jsonReport.skippedAssertions.length}\nTotal: ${jsonReport.passedAssertions.length + jsonReport.failedAssertions.length + jsonReport.skippedAssertions.length}\n`;

    uploadFile({
      token: argv['slack-token'],
      title: 'Report',
      initial_comment: message,
      channels: argv['slack-channel'],
      filename: reportFilename,
      filetype: 'json',
      content: rawJson
    }).then(response => {
      if (response.ok) {
        console.log(chalk.green(`Successfuly uploaded [${reportFilename}]\n`));
      } else {
        console.log(chalk.yellow(`There was a problem uploading report.json! Response body [`, response.body, `]\n`));
      }

      resolve(response);
    });
  });
}

function uploadFile(formData, headers) {
  return new Promise(resolve => {
    request.post({
      url: 'https://slack.com/api/files.upload',
      headers: headers,
      formData: formData
    }, (error, response) => {
      if (error) {
        console.error(chalk.red(error), '\n', error);
      }

      const responseJson = JSON.parse(response.body);
      resolve(responseJson);
    });
  });
}

function createZipArchive(zipFilename) {
  return new Promise(resolve => {
    var output = fs.createWriteStream(zipFilename);
    var archive = archiver('zip');

    output.on('finish', () => {
      console.log(archive.pointer() + ' bytes archived\n');

      resolve(output);
    });

    archive.on('error', (error) => {
      console.error(chalk.red(error));
    });

    archive.pipe(output);
    archive.directory(path.join('test', 'reports'), false);
    archive.finalize();
  });
}

function validateArguments() {
  if (argv.destination === 'slack') {
    if (argv['slack-channel'] === '' || argv['slack-token'] === '') {
      exitWithErrorMessage(`--slack-channel and --slack-token is required to post results to [${argv.destination}]`);
    }
  }
}

function exitWithErrorMessage(msg) {
  console.error(chalk.red(`${msg}\n`));
  process.exit(1);
}

module.exports = postResults();