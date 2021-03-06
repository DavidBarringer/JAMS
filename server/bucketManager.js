var playlist = require('../player/playlist.js');
var admin = require('./admin.js');
var logger = require('../log/logger.js');
var exec = require('child_process');
var buckets = [];

process.on("exit", () => {
  logger.log("Exit buckets state: " + buckets);
});

for(var i = 0; i < admin.getConfig().bucketNum; i++){
  buckets.push([]);
}
var lock = false;
const player = exec.fork(`${__dirname}/../player/player.js`, {detached: true});

function sleep(ms){
  return new Promise (resolve => {setTimeout(resolve,ms)});
}

player.on('message', async (msg) => {
  if(msg.cmd == "UPDATE"){
    if(lock != "PLAYER"){
      logger.warn("Something tried to write to buckets, but buckets were locked (this should not happen): PLAYER");
    }
    else{
      buckets = msg.buckets;
    }
  }
  if(msg.cmd == "LOCK"){
    while(lock && lock != lockName){
      await sleep(1000);
    }
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
  getBuckets: async function(lockName){
    while (lock && lock != lockName){
      await sleep(1000);
    }
    lock = lockName;
    player.send({cmd:"LOCK"});
    return new Promise((resolve) => resolve(buckets));
  },

  writeBuckets: function(lockName, toWrite){
    if(lock && lock != lockName){
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

  newBuckets: async function(bucketNum){
    await this.getBuckets("THIS");
    if(bucketNum == buckets.length){
      this.unlock("THIS");
      return;
    }
    else{
      if(bucketNum > buckets.length){
        var shiftNum = bucketNum - buckets.length;
        for(var i=0; i<shiftNum; i++){
          buckets.push([]);
          this.writeBuckets("THIS", buckets);
        }
      }
      else{
        var shiftNum = buckets.length - bucketNum;
        for(var i=0; i<shiftNum; i++){
          buckets.pop();
          this.writeBuckets("THIS", buckets);
        }
      }
    }
  },

  unlock: function(lockName){
    if(lock != lockName){
      logger.warn("Something tried to unlock buckets, but not the process that locked them (this should not happen): " + lockName + " " + lock);
    }
    else if(!lock){
      logger.warn("Something tried to unlock buckets, but they weren't locked (this should not happen): " + lockName + " " + lock);
    }
    else{
      lock = false;
      player.send({cmd: "UNLOCK"});
    }
  },

  kill: function(){
    player.send({cmd:"KILL"});
  }
}
