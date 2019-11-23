var fs = require('fs');
var path = require('path');
var bucketManager;
module.exports={
  setManager: function(manager){
    bucketManager = manager;
  },
  download: async function(id, res){
    var pth;
    var buckets = bucketManager.getBuckets("USERDL");
    for(var i = 0; i < buckets.length; i++){
      var bucket = buckets[i];
      for(var j = 0; j < bucket.length; j++){
        if(bucket[j].dlId == id){
          pth = bucket[j].path;
        }
      }
    }
    var buckets = bucketManager.unlock("USERDL");
    if(pth){
      var file = fs.readFileSync(pth);
      res.send(file);
    }
    else{
      res.status(404).send("Cannot download file");
    }
  }
}
