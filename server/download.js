var fs = require('fs');
var playlist = require('../player/playlist.js');
module.exports={
  download: async function(id, res){
    var path;
    var buckets = await playlist.read();
    for(var i = 0; i < buckets.length; i++){
      var bucket = buckets[i];
      for(var j = 0; j < bucket.length; j++){
        if(bucket[j].dlId == id){
          path = bucket[j].path;
        }
      }
      if(path){
        var file = fs.readFileSync(path);
        res.send(file);
      }
      else{
        res.status(404).send("Cannot download file");
      }
    }
  }
}
