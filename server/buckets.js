//var ytdl = require('youtube-dl');
var fs = require('fs');
var crypto = require('crypto');
var exec = require('child_process');
var bucketManager;
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
  setManager: function(manager){
    bucketManager = manager;
  },

  dl: async function (form, data, files, ip, res){
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
    url = url.split("&")[0];
    const jsondump = exec.spawn('youtube-dl', ['--dump-json', url]);
    jsondump.stderr.on('data', (err) => {
      logger.warn("Video upload failed: " + `${err}`);
      res.status(400).send("Cannot upload video, check the url and try again");
    });
    jsondump.stdout.on('data', async function (info){
      info = JSON.parse(`${info}`);
      var title = info.title;
      filename = info._filename;
      var buckets = await bucketManager.getBuckets("DL");
      var sTime;
      var hash = crypto.createHash('sha256');
      hash.update(filename + Date.now());
      filename = hash.digest('hex');
      if(info.duration){
        if(data.toFillTime)
          sTime = toFillTime;
        else if (startTime && endTime)
          sTime = endTime-startTime;
        else if (endTime)
          sTime = endTime;
        else {
          sTime = info.duration;
          if(startTime)
            sTime -= startTime;
        }
        //Sets time to max vid length if it is over
        if(sTime > maxDuration)
          sTime = maxDuration;
        availableBucket(buckets,ip,sTime).then((bucket) => {
          const ytdl = exec.spawn('youtube-dl', ['--format=mp4','--output=./tmp/' + filename + '.%(ext)s', url]);
          obj = {ip:ip, title:title, duration:sTime, startTime: startTime, endTime: endTime, toFillTime:data.toFillTime, url:url, filename:filename +'.mp4', played:"downloading", image:imagePath};
          buckets[bucket].push(obj);
          bucketManager.writeBuckets("DL", buckets);
          logger.log("Video uploaded via url" + JSON.stringify(obj));
          res.send("Video uploaded");
          ytdl.stdout.on('data', (data) => {
            console.log(`${data}`);
          });
          ytdl.on('close', async function (code){
            if(code !== 0){
              logger.err("An error occured while trying to download the video: " + url);
              res.status(400).send("An error occured while downloading the video");
              if(imagePath){
                fs.unlinkSync("./tmp/" + imagePath);
              }
              if(fs.existsSync("./tmp/" + filename + ".mp4")){
                fs.unlinkSync("./tmp/" + filenaem + ".mp4");
              }
              bucketManager.unlock("DL");
            }
            else{
              var buckets = await bucketManager.getBuckets("DL");
              bucketInfo = buckets[bucket];
              for(var i=0; i<bucketInfo.length; i++){
                if(bucketInfo[i].filename != obj.filename){
                  continue;
                }
                bucketInfo[i].played = false;
                logger.log("Video finished downloading " + JSON.stringify(bucketInfo[i]));
                bucketManager.writeBuckets("DL", buckets);
              }
              bucketManager.unlock("DL");
            }
          });
        }).catch((e) => {
          if(imagePath){
            fs.unlinkSync("./tmp/" + imagePath);
          }
          logger.log(JSON.stringify(ip) + " attempted to upload a video, but they had no available buckets.");
          res.status(400).send("Cannot upload video -- You don't enough bucket space");
          bucketManager.unlock("DL");
        });
      }
      else{
        bucketManager.unlock("DL");
        const ytdl = exec.spawn('youtube-dl', ['--format=mp4','--output=./tmp/' + filename + '.%(ext)s', url]);
        ytdl.on('close', async function(code){
          if(code !== 0){
            logger.error("An error occured while downloading the video: " + url);
            if(imagePath){
              fs.unlinkSync('./tmp/' + imagePath);
            }
            if(fs.existsSync('./tmp/' + filename + '.mp4')){
              fs.unlinkSync('./tmp/' + filename + '.mp4');
            }
          }
          else{
            buckets = await bucketManager.getBuckets("DL");
            var duration;
            ffmpeg.ffprobe('./tmp/' + filename + '.mp4', function (err, metadata){
              duration = "" + metadata.format.duration;
              duration = duration.split(".")[0];
              if(data.toFillTime)
                sTime = toFillTime;
              else if (startTime && endTime)
                sTime = endTime-startTime;
              else if (endTime)
                sTime = endTime;
              else {
                sTime = +duration;
                if(startTime)
                  sTime -= startTime;
              }
              if(sTime > maxDuration)
                sTime = maxDuration;
              availableBucket(buckets,ip,sTime).then((bucket) => {
                obj = {ip:ip, title:title, duration:sTime, startTime: startTime, endTime: endTime, toFillTime:data.toFillTime, url:url, filename:filename +'.mp4', played:false, image:imagePath};
                logger.log("Video downloaded: " + JSON.stringify(obj));
                buckets[bucket].push(obj);
                bucketManager.writeBuckets("DL", buckets);
              });
            });
          }
        });
      }
    });
  },

  check: function(url, res){
    if(url.search("playlist") != -1){
      res.status(400).send("Cannot upload a playlist");
      return;
    }
    url = url.split("&")[0]
    var jsondump = exec.spawn('youtube-dl', ['--dump-json', url]);
    jsondump.stderr.on('data', (err) => {
      console.log(`${err}`);
      logger.log("A video upload was attmpted: " + `${err}`);
      res.status(400).send("Cannot upload, check the url and try again");
    });
    jsondump.stdout.on('data', (info) => {
      info = JSON.parse(`${info}`);
      if(!info.duration){
        res.write({newVideoName: info.title, newVideoDuration: 0});
      }
      else{
        var obj = {newVideoName: info.title, newVideoDuration: info.duration};
        res.write(obj);
      }
      res.send();
    });
  },

  rm: async function(index,sIndex,ip){
    var buckets = await bucketManager.getBuckets("RM");
    var bucket = buckets[index];
    if(admin.adminSession(ip) || bucket[sIndex].ip == ip){
      var song = bucket.splice(sIndex, 1);
      logger.log("Video removed " + JSON.stringify(song));
      fs.unlinkSync('./tmp/' + song[0].filename);
      reallocate(buckets, index, ip);
    }
    else{
      bucketManager.unlock("RM");
    }

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
              }
            }
          }
        }
      }
      bucketManager.writeBuckets("RM", buckets);
    }
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

  fileSave: async function(form, data, files, ip, res){
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
    var buckets = await bucketManager.getBuckets("FILESAVE");
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
    availableBucket(buckets, ip, sTime).then((bucket)=>{
      res.send("Video uploaded");
      var obj = {ip: ip, title: data.filename, path: "./tmp/" + path.split("/")[2], duration: sTime, startTime: startTime, endTime: endTime, toFillTime: toFillTime, filename: path.split("/")[2], played: false, image: imagePath, dlId:dlId++};
      buckets[bucket].push(obj);
      bucketManager.writeBuckets("FILESAVE");
      logger.log("Video uploaded via manual upload " + JSON.stringify(obj));
      playlist.unlock();
    }).catch((e) => {
      logger.log(JSON.stringify(ip) + " attempted to upload a video, but they had no available buckets.");
      res.status(400).send("Cannot upload video -- You don't enough bucket space");
      bucketManager.unlock("FILESAVE");
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
