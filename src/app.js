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
const express = require('express');
const config = require('../config.js');
const Logger = require('../scripts/logger.js');
const logger = new Logger('Node app');
let server;

class App {
  constructor() {}

  startServer(localServerPort) {
    const app = express();
    app.set('views', path.join(__dirname, 'public'));
    app.use(express.static(path.join(__dirname, 'public')));

    app.use('/scripts', express.static(path.join(__dirname, '../', 'node_modules')));
    app.use('/shared', express.static(path.join(__dirname, '../', 'shared')));

    app.get('/', (req, res) => res.render('index'));
    app.get('/room', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'room.html')); // eslint-disable-line no-undef
    });
    app.get('/lag', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'lag.html')); // eslint-disable-line no-undef
    });
    app.get('/sync', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'sync.html')); // eslint-disable-line no-undef
    });
    app.get('/syncwatch', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'sync_watch.html')); // eslint-disable-line no-undef
    });
    app.get('/chat', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'chat.html')); // eslint-disable-line no-undef
    });

    // Scripts
    app.get('/common_v1.js', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'js', 'utils', 'common_v1.js')); // eslint-disable-line no-undef
    });
    app.get('/common_v2.js', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'js', 'utils', 'common_v2.js')); // eslint-disable-line no-undef
    });

    app.get('/channelId', (req, res) => {
      res.send(config.createdChannel.channelId);
      res.end();
    });

    app.get('*', (req, res) => res.status(404).send(
      {message: '404, not found'}
    ));
    server = app.listen(localServerPort, () => {
      logger.log(`Server started ${config.localServerAddress}:${localServerPort}`);
    });
  }

  stopServer() {
    server.close();
    logger.log(`Server stopped`);
  }
}

module.exports = App;