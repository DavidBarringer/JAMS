var fs = require('fs');
module.exports={
  download: function(filepath, res){
    console.log(filepath);
    var file = fs.readFileSync(filepath);
    res.send(file);
  }
}
