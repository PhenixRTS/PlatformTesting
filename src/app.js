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

const path = require('path');
const express = require('express');
const config = require('../config.js');
const Logger = require('../scripts/logger.js');
const logger = new Logger('Node app');
var server;

class App {
  constructor() {}

  startServer() {
    const app = express();
    app.set('views', path.join(__dirname, 'public')); // eslint-disable-line no-undef
    app.use(express.static(path.join(__dirname, 'public'))); // eslint-disable-line no-undef

    app.get('/', (req, res) => res.render('index'));

    app.get('*', (req, res) => res.status(404).send(
      {message: '404, not found'}
    ));
    server = app.listen(config.localServerPort, () => {
      logger.log(`Server started ${config.localServerAddress}:${config.localServerPort}`);
    });
  }

  stopServer() {
    server.close();
    logger.log(`Server stopped`);
  }
}

module.exports = App;