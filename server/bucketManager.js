// var playlist = require('../player/playlist.js');
const admin = require('./admin.js');
const logger = require('../log/logger.js');
const exec = require('child_process');
const fs = require('fs');
let buckets = [];

process.on("exit", () => {
  logger.log("Exit buckets state: " + buckets);
});

for(let i = 0; i < admin.getConfig().bucketNum; i++){
  buckets.push([]);
}
var lock = false;
// const player = exec.fork(`${__dirname}/../player/player.js`, {detached: true});

// function sleep(ms){
//   return new Promise (resolve => {setTimeout(resolve,ms)});
// }

// player.on('message', async (msg) => {
//   if(msg.cmd == "UPDATE"){
//     if(lock != "PLAYER"){
//       logger.warn("Something tried to write to buckets, but buckets were locked (this should not happen): PLAYER");
//     }
//     else{
//       buckets = msg.buckets;
//     }
//   }
//   if(msg.cmd == "LOCK"){
//     while(lock && lock != lockName){
//       await sleep(1000);
//     }
//     lock = "PLAYER";
//   }
//   if(msg.cmd == "UNLOCK"){
//     if(lock != "PLAYER"){
//       logger.warn("Something tried to unlock buckets, but not the process that locked them (this should not happen): PLAYER");
//     }
//     else if(!lock){
//       logger.warn("Something tried to unlock buckets, but they weren't locked (this should not happen): PLAYER");
//     }
//     else{
//       lock = false;
//     }
//   }
// });

module.exports = {
  getBuckets: async function(lockName){
    while (lock && lock != lockName){
    }
    lock = lockName;
    return new Promise((resolve) => resolve(buckets));
  },

  writeBuckets: function(lockName, toWrite){
    if(lock && lock != lockName){
      logger.warn("Something tried to write to buckets, but buckets were locked (this should not happen): " + lockName);
    } else {
      buckets = toWrite;
      lock = false;
    }
  },

  newBuckets: async function(bucketNum){
    await this.getBuckets("THIS");
    if(bucketNum == buckets.length){
      this.unlock("THIS");
      return;
    } else {
      if(bucketNum > buckets.length){
        var shiftNum = bucketNum - buckets.length;
        for(var i=0; i<shiftNum; i++){
          buckets.push([]);
          this.writeBuckets("THIS", buckets);
        }
      } else{
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
			} else if(!lock){
					logger.warn("Something tried to unlock buckets, but they weren't locked (this should not happen): " + lockName + " " + lock);
			} else{
					lock = false;
			}
  },
		
		clearBucket: async function(bucket){
				await this.getBuckets("THIS");
				for(var j = 0; j < bucket.length; j++){
						logger.log(JSON.stringify(bucket[j].filename));
						try{
								fs.unlinkSync('./tmp/' + bucket[j].filename);
								if(bucket[j].image){
										fs.unlinkSync('./tmp/' + bucket[j].image);
										logger.log(JSON.stringify(bucket[j].image));
								}
								this.unlock("THIS");
						}
						catch(e){
								logger.error("An error occured trying to remove video file " + JSON.stringify(bucket[j].filename) + "\nError: " + e);
								this.unlock("THIS");
						}
				}
		}
}
