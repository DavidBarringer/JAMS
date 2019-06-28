var fs = require('fs');
var playlist = require('../player/playlist.js');
var path = require('path');
module.exports={
  download: async function(id, res){
    var pth;
    var buckets = await playlist.read();
    for(var i = 0; i < buckets.length; i++){
      var bucket = buckets[i];
      for(var j = 0; j < bucket.length; j++){
        if(bucket[j].dlId == id){
          pth = bucket[j].path;
        }
      }
    }
    playlist.unlock();
    if(pth){
      var file = fs.readFileSync(pth);
      res.send(file);
      // var file = path.dirname(pth)
      // res.sendFile(pth.slice(pth.lastIndexOf("/")),{
      //   root:file
      // });
    }
    else{
      res.status(404).send("Cannot download file");
    }
  }
}
