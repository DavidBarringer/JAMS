/*
  The part that listens for post requests, then passes them onto relevant functions.
*/

var fs = require('fs');
var exec = require('child_process');
var dlManager = require('./buckets.js');
var bucketManager = require('./bucketManager.js');
var dl = require('./download.js');
dl.setManager(bucketManager);
dlManager.setManager(bucketManager);
var admin = require('./admin.js');
var alias = require('./alias.js');
var logger = require('../log/logger.js');
var formidable = require('formidable');
var exec = require('child_process');
var express = require('express'),
      path = require('path'),
      cors = require('cors');


      const template = fs.readFileSync('./src/index.html');
      const app = express();
      var port = admin.getPort();
      app.enable('trust proxy');
      app.set('trust proxy', 'loopback');
      app.use(express.static("dist"));
      app.use(function(req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        next();
      });
      app.use(express.json());

      app.get('/', function(req, res){
        res.end(template);
      });

      app.get('/songs', async function(req, res){
        var ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        var adminSession = admin.adminSession(ip);
        var config = admin.getConfig();
        var buckets = await bucketManager.getBuckets("SERVER");
        bucketManager.unlock("SERVER");
        res.send({buckets:buckets,ip:ip,adminSession:adminSession,config:config});
      });

      app.get('/alias', function(req, res){
        var aliases = alias.aliasesGet();
        res.send(aliases);
      });

      app.get('/download', function(req, res){
        var id = req.query.id;
        dl.download(id, res);
      });

      app.post('/remove', function(req,res){
        if(admin.adminSession(req.ip) || req.body.ip == req.ip){
          dlManager.rm(req.body.index,req.body.sIndex,req.body.ip);
          res.send("Done");
        }
      });

      app.post('/kill', function(req,res){
        if(admin.adminSession(req.ip) || req.body.songIp == req.ip){
          bucketManager.kill();
          res.send("Done");
        }
        else{
          res.send("You do not have permission to perform this command.");
        }
      });

      app.post('/upload', function(req, res){
        var form = new formidable.IncomingForm();
        var ip = req.ip || req.headers['x-forwarded-for'];
        form.parse(req,function (err, data, files){
          if(data.type == "url")
            dlManager.dl(form, data, files, ip, res);
          else if(data.type == "file"){
            dlManager.fileSave(form, data, files, ip, res);
          }
          else{
            res.status(404).send("Unknown data type");
          }
        });
      });

      app.post('/check', function(req, res){
        var url = req.body.url;
        dlManager.check(url, res);
      })

      app.post('/admin', function(req, res){
        if(req.body.type == "login"){
          if(admin.passMatch(req.body.password)){
            admin.adminLogin(req.ip);
            res.send("Login successful");
          }
          else{
            res.status(400).send("Incorrect password");
          }
        }
        else if(req.body.type == "logout"){
          admin.adminLogout(req.ip);
          res.send("Logout successful");
        }
        else if(req.body.type == "changeConfig" && admin.adminSession(req.ip)){
          var config = admin.getConfig();
          var oldNum = config.bucketNum;
          config.bucketNum = req.body.bucketNum;
          config.bucketVideos = req.body.bucketVideos;
          config.bucketLength = req.body.bucketLength;
          bucketManager.newBuckets(oldNum, req.body.bucketNum);
          admin.changeConfig(config);
        }
        else{
          res.status(400).send("Login failed");
        }
      });

      app.post('/alias', function(req, res){
        if(req.body.type == "set"){
          result = alias.aliasSet(req.ip, req.body.alias);
          res.send(result);
        }
        else if(req.body.type == "setRand"){
          result = alias.aliasRand(req.ip);
          res.send(result);
        }
        else{
          res.status(400).send("Login failed");
        }
      });

      app.post('/fileCheck', function(req, res){
        dlManager.fileCheck(req, req.ip, res);
      });

      app.post('/fileCancel', function(req, res){
        dlManager.fileCancel(req.body.loc, req.ip, res);
      });

      var server = app.listen(port, function(){
        logger.log("Server started running on port " + port);
      });
