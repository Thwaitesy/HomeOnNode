'use strict';

var log = require('./SystemLog');
var keypress = require('keypress');

// TODO change so that it waits for a command, then returns the result, the
// controller should then restart listening again, thus no need for keys,
// only modifiers and no callback.

function listen(keys, modifiers, callback) {
  log.init('[KeyPad]');
  log.todo('KEYPAD] Refactor to end after each key stroke.');
  var modifier;
  keypress(process.stdin);

  // listen for the 'keypress' event
  process.stdin.on('keypress', function(ch, key) {
    if ((key && key.ctrl && key.name === 'c') || (ch === 'q')) {
      callback({'exit': true, 'reason': 'SIGINT', 'code': 0});
    }

    if (ch === '\r') {
      ch = 'ENTER';
    } else if (ch === '\t') {
      ch = 'TAB';
    } else if (ch === '\x7f') {
      ch = 'BS';
    } else if (ch === '.') {
      ch = 'DOT';
    } else if (ch === '/') {
      ch = 'FW';
    } else if (ch === '#') {
      ch = 'HASH';
    } else if (ch === '$') {
      ch = 'DOLLAR';
    } else if (ch === '[') {
      ch = 'SQOPEN';
    } else if (ch === ']') {
      ch = 'SQCLOSE';
    }
    try {
      ch = ch.toString();
      var m = modifiers[ch];
      var k = keys[ch];
      if (m) {
        modifier = m;
        setTimeout(function() {
          modifier = undefined;
        }, 5000);
      } else if (k) {
        var body = {
          'command': k,
          'modifier': modifier
        };
        callback(body);
        modifier = undefined;
      }
    } catch (ex) {
      log.exception('[KEYPAD]', ex);
    }
  });

  process.stdin.setRawMode(true);
  process.stdin.resume();
}

exports.listen = listen;
