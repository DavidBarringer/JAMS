var playlist = require('../player/playlist.js');
var admin = require('./admin.js');
var logger = require('../log/logger.js');
var exec = require('child_process');
var buckets = [];
for(var i = 0; i < admin.getConfig().bucketNum; i++){
  buckets.push([]);
}
var lock = false;
const player = exec.fork(`${__dirname}/../player/player.js`, {detached: true});

player.on('message', (msg) => {
  if(msg.cmd == "UPDATE"){
    if(lock != "PLAYER"){
      logger.warn("Something tried to write to buckets, but buckets were locked (this should not happen): PLAYER");
    }
    else{
      buckets = msg.buckets;
    }
  }
  if(msg.cmd == "LOCK"){
    lock = "PLAYER";
  }
  if(msg.cmd == "UNLOCK"){
    if(lock != "PLAYER"){
      logger.warn("Something tried to unlock buckets, but not the process that locked them (this should not happen): PLAYER");
    }
    else if(!lock){
      logger.warn("Something tried to unlock buckets, but they weren't locked (this should not happen): PLAYER");
    }
    else{
      lock = false;
    }
  }
});

module.exports = {
  getBuckets: function(lockName){
    while (lock && lock != lockName){
      setTimeout(function(){
        console.log(lock, lockName);
      },1000);
    }
    lock = lockName;
    player.send({cmd:"LOCK"});
    return new Promise((resolve) => resolve(buckets));
  },

  writeBuckets: function(lockName, toWrite){
    if(lock != lockName){
      logger.warn("Something tried to write to buckets, but buckets were locked (this should not happen): " + lockName);
    }
    else{
      buckets = toWrite;
      if(lockName != "PLAYER"){
        player.send({cmd: "UPDATE", buckets:buckets});
      }
      lock = false;
      player.send({cmd: "UNLOCK"});
    }
  },

  unlock: function(lockName){
    if(lock != lockName){
      logger.warn("Something tried to unlock buckets, but not the process that locked them (this should not happen): " + lockName);
    }
    else if(!lock){
      logger.warn("Something tried to unlock buckets, but they weren't locked (this should not happen): " + lockName);
    }
    else{
      lock = false;
      player.send({cmd: "UNLOCK"});
    }
  }
}
