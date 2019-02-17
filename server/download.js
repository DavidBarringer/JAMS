var fs = require('fs');
module.exports={
  download: function(filepath, res){
    var file = fs.readFileSync(filepath);
    res.send(file);
  }
}
