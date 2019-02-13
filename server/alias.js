var aliases = [];
var csv = require('csvtojson');
module.exports={
  aliasSet: function(ip, alias){
    var obj = {ip:ip,alias:alias};
    for(var i = 0; i<aliases.length; i++){
      if(aliases[i].ip==ip){
        if(aliases[i].alias==alias){
          return aliases;
        }
        else{
          aliases.splice(i,1);
          aliases.push(obj);
          logger.log("A user has changed their alias " + obj);
          return aliases;
        }
      }
    }
    aliases.push(obj);
    return aliases;
  },

  aliasRand: async function(ip){
    var list = await csv().fromFile("namelist.csv");
    var alias = list[Math.floor(Math.random()*list.length)].Name;
    var obj = {ip:ip,alias:alias};
    for(var i = 0; i<aliases.length; i++){
      if(aliases[i].ip==ip){
        if(aliases[i].alias==alias){
          return alias;
        }
        else{
          aliases.splice(i,1);
          aliases.push(obj);
          return alias;
        }
      }
    }
    aliases.push(obj);
    return alias;
  },

  aliasesGet: function(){
    return aliases;
  }
}
