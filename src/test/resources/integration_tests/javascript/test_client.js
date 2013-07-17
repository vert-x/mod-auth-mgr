/*
 * Copyright 2011-2012 the original author or authors.
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

var container = require("vertx/container")
var vertx = require("vertx");
var vertxTests = require("vertx_tests");
var vassert = require("vertx_assert");
var console = require("vertx/console");

var eb = vertx.eventBus;

function testLoginDeniedEmptyDB() {
  deleteAll(function() {
    eb.send('test.authMgr.login', {username: 'tim', password: 'foo'}, function(reply) {
      vassert.assertEquals('denied', reply.status);
      vassert.testComplete();
    });
  });
}

function testLoginDeniedNonMatchingOthers() {
  deleteAll(function() {
    storeEntries({username: 'bob', password: 'wibble'},
      {username: 'jane', password: 'uhuwdh'}, function() {
        eb.send('test.authMgr.login', {username: 'tim', password: 'foo'}, function(reply) {
          vassert.assertEquals('denied', reply.status);
          vassert.testComplete();
        });
    });
  });
}

function testLoginDeniedWrongPassword() {
  deleteAll(function() {
    storeEntries({username: 'bob', password: 'wibble'},
      {username: 'tim', password: 'bar'}, function() {
        eb.send('test.authMgr.login', {username: 'tim', password: 'foo'}, function(reply) {
          vassert.assertEquals('denied', reply.status);
          vassert.testComplete();
        });
      });
  });

}

function testLoginDeniedOtherUserWithSamePassword() {
  deleteAll(function() {
    storeEntries({username: 'bob', password: 'foo'},
      {username: 'tim', password: 'bar'}, function() {
        eb.send('test.authMgr.login', {username: 'tim', password: 'foo'}, function(reply) {
          vassert.assertEquals('denied', reply.status);
          vassert.testComplete();
        });
      });
  });
}

function testLoginOKOneEntryInDB() {
  deleteAll(function() {
    storeEntries({username: 'tim', password: 'foo'}, function() {
      eb.send('test.authMgr.login', {username: 'tim', password: 'foo'}, function(reply) {
        vassert.assertEquals('ok', reply.status);
        vassert.assertTrue(typeof reply.sessionID != 'undefined');
        vassert.testComplete();
      });
    });
  });

}

function testLoginOKMultipleEntryInDB() {
  deleteAll(function() {
    storeEntries({username: 'tim', password: 'foo'},
      {username: 'bob', password: 'uahuhd'},
      {username: 'jane', password: 'ijqiejoiwjqe'}, function() {
        eb.send('test.authMgr.login', {username: 'tim', password: 'foo'}, function(reply) {
          vassert.assertEquals('ok', reply.status);
          vassert.assertTrue(typeof reply.sessionID != 'undefined');
          vassert.testComplete();
        });
      });
  });
}

function testValidateDeniedNotLoggedIn() {
  deleteAll(function() {
    eb.send('test.authMgr.authorise', {sessionID: 'uhiuhuhihu', password: 'foo'}, function(reply) {
      vassert.assertEquals('denied', reply.status);
      vassert.testComplete();
    });
  });

}

function testValidateDeniedInvalidSessionID() {
  deleteAll(function() {
    eb.send('test.authMgr.authorise', {sessionID: 'uhiuhuhihu', password: 'foo'}, function(reply) {
      vassert.assertEquals('denied', reply.status);
      vassert.testComplete();
    });
  });

}

function testValidateDeniedLoggedInWrongSessionID() {
  deleteAll(function() {
    storeEntries({username: 'tim', password: 'foo'}, function() {
      eb.send('test.authMgr.login', {username: 'tim', password: 'foo'}, function(reply) {
        vassert.assertEquals('ok', reply.status);
        vassert.assertTrue(typeof reply.sessionID != 'undefined');
        eb.send('test.authMgr.authorise', {sessionID: 'uhiuhuhihu', password: 'foo'}, function(reply) {
          vassert.assertEquals('denied', reply.status);
          vassert.testComplete();
        });
      });
    });
  });

}

function testValidateDeniedLoggedOut() {
  deleteAll(function() {
    storeEntries({username: 'tim', password: 'foo'}, function() {
      eb.send('test.authMgr.login', {username: 'tim', password: 'foo'}, function(reply) {
        vassert.assertEquals('ok', reply.status);
        var sessionID = reply.sessionID;
        eb.send('test.authMgr.logout', {sessionID: sessionID}, function(reply) {
          vassert.assertEquals('ok', reply.status);
          eb.send('test.authMgr.authorise', {sessionID: sessionID}, function(reply) {
            vassert.assertEquals('denied', reply.status);
            vassert.testComplete();
          });
        });
      });
    });
  });
}

function testValidateOK() {
  deleteAll(function() {
    storeEntries({username: 'tim', password: 'foo'}, function() {
      eb.send('test.authMgr.login', {username: 'tim', password: 'foo'}, function(reply) {
        vassert.assertEquals('ok', reply.status);
        vassert.assertTrue(typeof reply.sessionID != 'undefined');
        var sessionID = reply.sessionID;
        eb.send('test.authMgr.authorise', {sessionID: sessionID, password: 'foo'}, function(reply) {
          vassert.assertEquals('ok', reply.status);
          vassert.testComplete();
        });
      });
    });
  });
}

function testLoginMoreThanOnce() {
  deleteAll(function() {
    storeEntries({username: 'tim', password: 'foo'}, function() {
      eb.send('test.authMgr.login', {username: 'tim', password: 'foo'}, function(reply) {
        vassert.assertEquals('ok', reply.status);
        var sessionID = reply.sessionID;
        eb.send('test.authMgr.login', {username: 'tim', password: 'foo'}, function(reply) {
          vassert.assertEquals('ok', reply.status);
          // Should be different session ID
          var newSessionID = reply.sessionID;
          vassert.assertTrue(newSessionID != sessionID);
          eb.send('test.authMgr.logout', {sessionID: sessionID}, function(reply) {
            vassert.assertEquals('error', reply.status);
            vassert.assertEquals('Not logged in', reply.message);
            eb.send('test.authMgr.authorise', {sessionID: sessionID}, function(reply) {
              vassert.assertEquals('denied', reply.status);
              eb.send('test.authMgr.authorise', {sessionID: newSessionID}, function(reply) {
                vassert.assertEquals('ok', reply.status);
                eb.send('test.authMgr.logout', {sessionID: newSessionID}, function(reply) {
                  vassert.assertEquals('ok', reply.status);
                  eb.send('test.authMgr.authorise', {sessionID: newSessionID}, function(reply) {
                    vassert.assertEquals('denied', reply.status);
                    vassert.testComplete();
                  });
                });
              });
            });
          });
        });
      });
    });
  });
}

function testLoginMoreThanOnceThenLogout() {
  deleteAll(function() {
    storeEntries({username: 'tim', password: 'foo'}, function() {
      eb.send('test.authMgr.login', {username: 'tim', password: 'foo'}, function(reply) {
        vassert.assertEquals('ok', reply.status);
        var sessionID = reply.sessionID;
        eb.send('test.authMgr.login', {username: 'tim', password: 'foo'}, function(reply) {
          vassert.assertEquals('ok', reply.status);
          // Should be different session ID
          vassert.assertTrue(reply.sessionID != sessionID);
          vassert.testComplete();
        });
      });
    });
  });
}

function storeEntries() {
  var doneHandler = arguments[arguments.length - 1];
  var count = 0;
  var numToStore = arguments.length - 1;
  for (var i = 0; i < arguments.length - 1; i++) {
    var entry = arguments[i];
    eb.send('test.persistor', {
      collection: 'users',
      action: 'save',
      document: entry
    }, function(reply) {
      vassert.assertEquals('ok', reply.status);
      if (++count == numToStore) {
        doneHandler();
      }
    });
  }
}

function deleteAll(doneHandler) {
  eb.send('test.persistor', {
    collection: 'users',
    action: 'delete',
    matcher: {}
  }, function(reply) {
    vassert.assertEquals('ok', reply.status);
    doneHandler();
  });
}

var script = this;
var persistorConfig =
{
  address: 'test.persistor',
  db_name: java.lang.System.getProperty("vertx.mongo.database", "test_db"),
  host: java.lang.System.getProperty("vertx.mongo.host", "localhost"),
  port: java.lang.Integer.valueOf(java.lang.System.getProperty("vertx.mongo.port", "27017"))
}
var username = java.lang.System.getProperty("vertx.mongo.username");
var password = java.lang.System.getProperty("vertx.mongo.password");
if (username != null) {
  persistorConfig.username = username;
  persistorConfig.password = password;
}
var authMgrConfig = {address: 'test.authMgr', 'persistor_address' : 'test.persistor', 'user_collection': 'users'}
container.deployModule('io.vertx~mod-mongo-persistor~2.0.0-final', persistorConfig, 1, function(err, depID) {
  container.deployModule(java.lang.System.getProperty("vertx.modulename"), authMgrConfig, 1, function(err, depID) {
    vertxTests.startTests(script);
  });
});
