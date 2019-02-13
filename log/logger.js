var fs = require('fs');
var date = new Date();
var y = date.getFullYear();
var m = date.getMonth()+1;
var d = date.getDate();
var path = "./log/log_" + d + "-" + m + "-" + y + ".log"
try{
  fs.writeFileSync(path, "");
}
catch(e){}

function getTime(){
  date = new Date();
  y = date.getFullYear();
  m = date.getMonth()+1;
  d = date.getDate();
  h = date.getHours();
  min = date.getMinutes();
  s = date.getSeconds();
  return d + "/" + m + "/" + y + " " + h + ":" + min + ":" + s + " ";
}

module.exports={
  log: function(message){
    var ms = getTime() + "[LOG]: " + message;
    fs.writeFileSync(path, ms, {flags: 'a+'});
  },

  warn: function(message){
    var ms = getTime() + "[WARN]: " + message;
    fs.writeFileSync(path, ms, {flags: 'a+'});
  },

  error: function(message){
    var ms = getTime() + "[ERROR]: " + message;
    fs.writeFileSync(path, ms, {flags: 'a+'});
  }
}
