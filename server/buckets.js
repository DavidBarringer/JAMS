var ytdl = require('youtube-dl');
var fs = require('fs');
var crypto = require('crypto');
var playlist = require('../player/playlist.js');
var admin = require('./admin.js');
var logger = require('../log/logger.js');
var formidable = require('formidable');
var ffmpeg = require('fluent-ffmpeg');
var dlId = 0;

var fileTmp = [];

/*
  Finds the first available bucket that accomodates the videos runtime,
  if the video cannot fit into any bucket, -1 is returned.

  Finds bucket by checking each one in order, then adding the length of
  all videos added by *user* then checking if add new video would exceed
  the maximum allocated time.
*/
function availableBucket(buckets, user, duration){
  var config = admin.getConfig();
  var maxDuration = config.bucketLength;
  var maxCount = config.bucketVideos;
  var count;
  for(var i = 0; i < buckets.length; i++){
    var bucket = buckets[i];
    var durationSum = 0;
    count = 0;
    var notFull = bucket.every(function(item){
      if(item.ip != user){
        return 1;
      }
      else{
        count++;
        durationSum += Number(item.duration);
        var total = Number(durationSum) + Number(duration);
        if(total > maxDuration || count >= maxCount){
          return 0;
        }
        return 1;
      }
    });
    if(notFull)
      return new Promise((resolve) => resolve(i));
  }
  return new Promise((resolve,reject) => reject(-1));
}

try{
  fs.mkdirSync('./tmp');
}
catch(e){}

module.exports = {
  dl: function (form, data, files, ip, res){
    var maxDuration = admin.getConfig().bucketLength;
    var filename;
    var bucket;
    var obj;
    var url = data.url;
    var startTime = data.startTime;

    var endTime = data.endTime;
    var toFillTime = data.toFillTime;
    var imagePath = "";
    if(files.image){
      var file = files.image;
      var hash = crypto.createHash('sha256');
      hash.update(file.name + Date.now());
      imagePath = hash.digest('hex') + "." + file.type.substring(6);
      fs.copyFileSync(file.path, "./tmp/" + imagePath);
      fs.unlinkSync(file.path);
    }
    if(url.search("playlist") != -1){
      res.status(400).send("Cannot upload a playlist");
      return;
    }
    try{
      ytdl.getInfo(url, function(err,info){
        if(err){
          logger.warn("Video upload failed: " + JSON.stringify(err));
          res.status(400).send("Cannot upload, check the url and try again");
        }
        else{
          var title = info.title;
          filename = info._filename;
          playlist.read().then((buckets) => {
            var sTime;
            if(data.toFillTime)
              sTime = toFillTime;
            else if (startTime && endTime)
              sTime = endTime-startTime;
            else if (endTime)
              sTime = endTime;
            else {
              //Function that takes time of the form hh:mm:ss and converts it to seconds
              var a = info.duration.split(':');
              sTime = a.reduce((acc, time) => (60 * acc) + +time);
              if(startTime)
                sTime -= startTime;
            }
            //Sets time to max vid length if it is over
            if(sTime > maxDuration)
              sTime = maxDuration;
            availableBucket(buckets,ip,sTime).then((result) => {
              var vid = ytdl(url);
              var hash = crypto.createHash('sha256');
              hash.update(filename + Date.now());
              filename = hash.digest('hex');
              vid.pipe(fs.createWriteStream('tmp/'+ filename +'.mp4'));
              bucket = result;
              obj = {ip:ip, title:title, duration:sTime, startTime: startTime, endTime: endTime, toFillTime:data.toFillTime, url:url, filename:filename +'.mp4', played:"downloading", image:imagePath};
              buckets[bucket].push(obj);
              playlist.unlock();
              playlist.write(buckets).then((result) => {
                playlist.unlock();
                logger.log("Video uploaded via url" + JSON.stringify(obj));
                res.send("Video uploaded");
              });
              vid.on('end', function(){
                playlist.read().then((buckets) => {
                  bucketInfo = buckets[bucket];
                  for(var i=0; i<bucketInfo.length; i++){
                    if(bucketInfo[i].filename != obj.filename){
                      continue;
                    }
                    bucketInfo[i].played = false;
                    logger.log("Video finished downloading " + JSON.stringify(bucketInfo[i]));
                    playlist.unlock();
                    playlist.write(buckets).then((result) => {
                      playlist.unlock();
                    });
                  }
                  playlist.unlock();
                });
              });
            }).catch((e) => {
              if(imagePath){
                fs.unlinkSync("./tmp/" + imagePath);
              }
              logger.log(JSON.stringify(ip) + " attempted to upload a video, but they had no available buckets.");
              res.status(400).send("Cannot upload video -- You don't enough bucket space");
              playlist.unlock();
            });
          });
        }
      });
    }
    catch(e){
      res.status(400).send("Cannot upload video, youtube-dl has encountered an error");
    }
  },

  check: function(url, res){
    if(url.search("playlist") != -1){
      res.status(400).send("Cannot upload a playlist");
      return;
    }
    try{
      ytdl.getInfo(url, function(err,info){
        if(err){
          res.status(400).send("Cannot upload, check the url and try again");
          return;
        }
        if(!info.duration){
          res.status(400).send("Cannot upload, check the url and try again");
          logger.error("WEIRD FUCKERY: " + JSON.stringify(info));
          return;
        }
        var a = info.duration.split(':');
        var sTime = a.reduce((acc, time) => (60 * acc) + +time);
        var obj = {newVideoName: info.title, newVideoDuration: sTime};
        res.send(obj);
      });
    }
    catch(e){
      logger.error("youtube-dl fucked up");
    }
  },

  rm: function(index,sIndex,ip){
    playlist.read().then((buckets) => {
      var bucket = buckets[index];
      if(admin.adminSession(ip) || bucket[sIndex].ip == ip){
        var song = bucket.splice(sIndex, 1);
        playlist.unlock();
        playlist.write(buckets).then((res)=>{
          logger.log("Video removed " + JSON.stringify(song));
          fs.unlinkSync('./tmp/' + song[0].filename);
          playlist.unlock();
          reallocate(buckets, index, ip);
        });
      }
      else{
        playlist.unlock();
      }
    });

    async function reallocate(buckets, index, ip){
      for(var i = index+1; i<buckets.length; i++){
        for(var j = index+1; j<buckets.length; j++){
          var bucket = buckets[j];
          for(var k = 0; k<bucket.length; k++){
            if(bucket[k].ip != ip){
              continue;
            }
            else{
              newBucket = await availableBucket(buckets, ip, bucket[k].duration);
              if(newBucket < j){
                buckets[newBucket].push(bucket[k]);
                bucket.splice(k,1);
                playlist.write(buckets).then((res)=>{
                  playlist.unlock();
                });
              }
            }
          }
        }
      }
    }
  },

  get: async function(){
    var result = await playlist.read();
    playlist.unlock();
    return result;
  },

  fileCheck: function(req, ip, res){
    var form = new formidable.IncomingForm();
    form.maxFileSize = 500*1024*1024;
    var filename;
    var givenName;

    form.on('error', function(err){
      res.status(403).send('The file cannot be uploaded');
      logger.log(ip + " tried to upload a file, but it could not be downloaded: " + err);
    });

    form.parse(req);

    form.on('fileBegin', function (name, file){
      givenName = file.name;
      var hash = crypto.createHash('sha256');
      hash.update(file.name + Date.now());
      filename = hash.digest('hex');
      file.path = "./tmp/" + filename + "." + file.type.substring(6);
    });

    form.on('file', function(name, file){
      ffmpeg.ffprobe(file.path, function(err, metadata) {
        var duration = "" + metadata.format.duration;
        duration = duration.split(".")[0];
        fileTmp.push({path: file.path, ip: req.ip});
        res.send({name: givenName, duration: duration, loc:fileTmp.length-1});
      });
    });
  },

  fileSave: function(form, data, files, ip, res){
    var maxDuration = admin.getConfig().bucketLength;
    var startTime = data.startTime;
    var endTime = data.endTime;
    var toFillTime = data.toFillTime;
    var imagePath = "";
    if(files.fImage){
      var file = files.fImage;
      var hash = crypto.createHash('sha256');
      hash.update(file.name + Date.now());
      imagePath = hash.digest('hex') + "." + file.type.substring(6);
      fs.copyFileSync(file.path, "./tmp/" + imagePath);
      fs.unlinkSync(file.path);
    }
    var path;
    if(!fileTmp[data.loc]){
      return;
    }
    if(fileTmp[data.loc].ip == ip){
      path = fileTmp[data.loc].path;
      fileTmp.splice(data.loc, 1);
    }
    playlist.read().then((buckets) => {
      var sTime;
      if(toFillTime)
        sTime = toFillTime;
      else if (endTime)
        sTime = endTime;
      else
        sTime = data.duration;
      if(startTime)
        sTime -= startTime;
      if(sTime > maxDuration)
        sTime = maxDuration;
      availableBucket(buckets, ip, sTime).then((result)=>{
        var bucket = result;
        res.send("Video uploaded");
        var obj = {ip: ip, title: data.filename, path: "./tmp/" + path.split("/")[2], duration: sTime, startTime: startTime, endTime: endTime, toFillTime: toFillTime, filename: path.split("/")[2], played: false, image: imagePath, dlId:dlId++};
        buckets[bucket].push(obj);
        playlist.unlock();
        playlist.write(buckets).then((result) => {
          logger.log("Video uploaded via manual upload " + JSON.stringify(obj));
          playlist.unlock();
        });
      }).catch((e) => {
        logger.log(JSON.stringify(ip) + " attempted to upload a video, but they had no available buckets.");
        res.status(400).send("Cannot upload video -- You don't enough bucket space");
        playlist.unlock();
      });
    });
  },

  fileCancel: function(loc, ip ,res){
    if(fileTmp[loc].ip == ip){
      fs.unlinkSync(fileTmp[loc].path);
      fileTmp.splice(loc, 1);
    }
    res.send("Complete");
  }
}
