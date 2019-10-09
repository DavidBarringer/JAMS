var jsonfile = require('jsonfile');
var fs = require('fs');
try{
  fs.mkdirSync("./list/");
  fs.writeFileSync('./list/buckets.json', '');
}
catch(e){}
var admin = require('../server/admin.js');
var logger = require('../log/logger.js');

module.exports = {
  new: function(){
    var buckets = [];
    for(var i = 0; i < admin.getConfig().bucketNum; i++){
      buckets.push([]);
    }
    return buckets;
  },
  newBuckets: function(buckets, oldNum, newNum){
    var diff = newNum - oldNum;
    if(diff < 0){
      buckets.splice(diff + buckets.length);
    }
    else if(diff > 0){
      for(var i = 0; i < diff; i++){
        buckets.push([]);
      }
    }
    return buckets;
  },
  read: function(){
    while(fs.existsSync('./list/buckets.lock')){}
    this.lock();
    var result = jsonfile.readFileSync('./list/buckets.json');
    return new Promise((resolve) => resolve(result));
  },
  write: function(data){
    while(fs.existsSync('./list/buckets.lock')){}
    this.lock();
    var result = jsonfile.writeFileSync('./list/buckets.json', data,{spaces:2,EOL: '\r\n'});
    return new Promise((resolve) => resolve(result));
  },
  lock: function(){
    fs.writeFileSync('./list/buckets.lock', "");
  },
  unlock: function(){
    if(fs.existsSync('./list/buckets.lock')){
      fs.unlinkSync('./list/buckets.lock');
    }
  }
}
