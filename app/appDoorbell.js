'use strict';

var fs = require('fs');
var log = require('./SystemLog');
var fbHelper = require('./FBHelper');
var Keys = require('./Keys').keys;
var webRequest = require('./webRequest');
var Gpio = require('onoff').Gpio;

var APP_NAME = 'REMOTE';
var fb;
var config;

log.setLogFileName('./start.log');
log.setFileLogging(true);
log.appStart(APP_NAME);

function sendCommand(command, path) {
  path = path || '/execute/name';
  var uri = {
    'host': config.controller.ip,
    'port': config.controller.port,
    'path': path,
    'method': 'POST'
  };
  if (typeof command === 'object') {
    command = JSON.stringify(command);
  }
  try {
    log.http('REQ', command);
    webRequest.request(uri, command, function(resp) {
      log.http('RESP', JSON.stringify(resp));
    });
  } catch (ex) {
    log.exception('[sendCommand] Failed', ex);
  }
}

fs.readFile('config.json', {'encoding': 'utf8'}, function(err, data) {
  if (err) {
    log.exception('Unable to open config file.', err);
  } else {
    config = JSON.parse(data);
    APP_NAME = config.appName;
    fb = fbHelper.init(Keys.firebase.appId, Keys.firebase.key, APP_NAME);

    fb.child('config/' + APP_NAME + '/logs').on('value', function(snapshot) {
      var logSettings = snapshot.val();
      if (logSettings) {
        if (logSettings.logLevel === 'DEBUG') {
          log.setDebug(true);
        } else {
          log.setDebug(false);
        }
        if (logSettings.toFirebase === true) {
          log.setFirebase(fb);
        } else {
          log.setFirebase(null);
        }
        if (logSettings.toFilename) {
          log.setLogFileName(logSettings.toFilename);
        }
        if (logSettings.toFile === true) {
          log.setFileLogging(true);
        } else {
          log.setFileLogging(false);
        }
      }
    });

    if (config.doorbell) {
      var doorbellState = 'RELEASED';
      var pin = new Gpio(config.doorbell, 'in', 'both');
      pin.watch(function(error, value) {
        if (error) {
          log.error('[DOORBELL] Error watching doorbell: ' + error);
        }
        log.debug('[DOORBELL] Pin Changed: ' + value);
        if ((value === 1) && (doorbellState === 'RELEASED')) {
          doorbellState = 'PUSHED';
          log.log('[DOORBELL] Pushed');
          sendCommand({cmdName: 'DOORBELL'});
        } else if ((value === 0) && (doorbellState === 'PUSHED')) {
          doorbellState = 'RELEASED';
          log.log('[DOORBELL] Released');
        } else {
          log.debug('[DOORBELL] Fired for unchanged state.');
        }
      });
    }

  }
});

function exit(sender, exitCode) {
  exitCode = exitCode || 0;
  log.log('[APP] Starting shutdown process');
  log.log('[APP] Will exit with error code: ' + String(exitCode));
  setTimeout(function() {
    log.appStop(sender);
    process.exit(exitCode);
  }, 1500);
}

process.on('SIGINT', function() {
  exit('SIGINT', 0);
});
