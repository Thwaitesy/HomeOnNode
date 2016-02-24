'use strict';

var Keys = require('./Keys').keys;
var Firebase = require('firebase');
var log = require('./SystemLog');
var exec = require('child_process').exec;

var deviceName = 'HomeOnNode';
var fbURL = 'https://' + Keys.firebase.appId + '.firebaseio.com/';
var fb = new Firebase(fbURL);
var fbNode;

log.appStart(deviceName);

fb.authWithCustomToken(Keys.firebase.key, function(error, authToken) {
  if (error) {
    log.exception('Auth failed.', error);
  } else {
    log.log('Auth success.');
    fbReady();
  }
});

function fbReady() {
  fbNode = fb.child('devices/' + deviceName + '/host');
  fb.child('.info/connected').on('value', function(snapshot) {
    if (snapshot.val() === true) {
      log.log('Connected.');
      fbNode.child('alive').set(true);
      fbNode.child('alive').onDisconnect().set(false);
      fbNode.child('reboot').set(false);
      fbNode.child('reboot').onDisconnect().remove();
      fbNode.child('heartbeat').set(Date.now());
      fbNode.child('heartbeat').onDisconnect().remove();
      fbNode.child('offlineAt').remove();
      fbNode.child('offlineAt')
        .onDisconnect().set(Firebase.ServerValue.TIMESTAMP);
    } else {
      log.warn('Disconnected.');
    }
  });
  fbNode.child('reboot').on('value', rebootRequest);
  setInterval(heartbeat, 75 * 1000);
}

function heartbeat() {
  fbNode.child('heartbeat').set(Date.now());
}

function rebootRequest(snapshot) {
  if (snapshot.val() === true) {
    log.log('Reboot requested.');
    var cmd = 'sudo reboot';
    exec(cmd, function(error, stdout, stderr) {});
  }
}