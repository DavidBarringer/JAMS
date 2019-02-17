var jsonfile = require('jsonfile');
var fs = require('fs');
try{
  fs.mkdirSync("./list/");
  fs.writeFileSync('./list/buckets.json', '');
}
catch(e){}
var locked = false;
var admin = require('../server/admin.js');

module.exports = {
  new: function(){
    var buckets = [];
    for(var i = 0; i < admin.getConfig().bucketNum; i++){
      buckets.push([]);
    }
    jsonfile.writeFileSync('./list/buckets.json', buckets);
  },
  newBuckets: function(oldNum, newNum){
    var diff = newNum - oldNum;
    if(diff < 0){
      this.read().then((buckets) => {
        buckets.splice(diff + buckets.length);
        this.unlock();
        this.write(buckets).then((res) => this.unlock());
      });
    }
    else if(diff > 0){
      this.read().then((buckets) => {
        for(var i = 0; i < diff; i++){
          buckets.push([]);
        }
        this.unlock();
        this.write(buckets).then((res) => this.unlock());
      });
    }
  },
  read: function(){
    while(locked){}
    locked = true;
    var result = jsonfile.readFileSync('./list/buckets.json');
    return new Promise((resolve) => resolve(result));
  },
  write: function(data){
    while(locked){}
    locked = true;
    var result = jsonfile.writeFileSync('./list/buckets.json', data,{spaces:2,EOL: '\r\n'});
    return new Promise((resolve) => resolve(result));
  },
  lock: function(){
    locked = true;
  },
  unlock: function(){
    locked = false;
  }
}
