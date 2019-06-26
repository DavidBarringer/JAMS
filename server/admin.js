var fs = require('fs');
fs.copyFileSync('config.json', 'configActive.json');
var jsonfile = require('jsonfile');
var admins = [];
var crypto = require('crypto');
var logger = require('../log/logger.js');
var config = jsonfile.readFileSync('configActive.json');
module.exports={
  adminLogin: function(ip){
    admins.push(ip);
    logger.log("A user has logged in as an admin " + ip);
    setTimeout(function(){
      if(admins.includes(ip))
        admins.splice(admins.indexOf(ip),1);
    }, 1000 * 60 * 20);
  },

  passMatch: function(password){
    var hash = crypto.createHash('sha256');
    hash.update(password);
    return hash.digest('hex') === config.password;
  },

  adminSession: function(ip){
    return admins.includes(ip);
  },

  adminLogout: function(ip){
    logger.log("A user has logged out of an admin session " + ip);
    admins.splice(admins.indexOf(ip),1)
  },

  getPort: function(){
    var conf = jsonfile.readFileSync('configActive.json');
    return conf.port;
  },

  getConfig: function(){
    var conf = jsonfile.readFileSync('configActive.json');
    var res = {bucketNum:conf.bucketNum, bucketVideos:conf.bucketVideos, bucketLength:conf.bucketLength};
    return res;
  },

  changeConfig: function(newConfig){
    logger.log("The config has been changed " + newConfig);
    var conf = jsonfile.readFileSync('configActive.json');
    jsonfile.writeFileSync('configActive.json', config);
    config = newConfig;
  }
}
