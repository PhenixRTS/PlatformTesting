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

const Webpack = require('webpack');
const webpackConfig = require('./webpack.config.js');

module.exports = function() {
  return new Promise((resolve, reject) => {
    let bundleStart = null;
    const compiler = Webpack(webpackConfig);

    compiler.plugin('compile', () => {
      console.log('Bundling...');
      bundleStart = Date.now();
    });
    compiler.plugin('done', (multiStats) => {
      console.log('Bundled in ' + (Date.now() - bundleStart) + 'ms!');

      const errors = multiStats.stats.reduce((errors, stat) => {
        return errors.concat(stat.compilation.errors);
      }, []);

      if (errors.length > 0) {
        return reject(errors);
      }

      resolve();
    });
    compiler.plugin('error', (e) => {
      console.log('Failure to bundle [%s]', e);
      reject(e);
    });
    compiler.plugin('failed', (e) => {
      console.log('Failure to bundle [%s]', e);
      reject(e);
    });

    compiler.run((err, stats) => {
      console.log(stats.toString({
        // Config for minimal console.log mess.
        assets: true,
        colors: true,
        version: false,
        hash: true,
        timings: false,
        chunks: false,
        chunkModules: false,
        quiet: false,
        noInfo: false,
        children: false,
        errors: true
      }));
    });
  });
};