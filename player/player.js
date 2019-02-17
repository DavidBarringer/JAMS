var fs = require('fs');
var exec = require('child_process');
var playlist = require('./playlist.js');
var admin = require('../server/admin.js');
var logger = require('../log/logger.js');
var currentBucket;
var vid;
var i = 0;
setInterval(function(){
  playlist.read().then((buckets) => {
    currentBucket = buckets[0];
    if(currentBucket.length != 0){
      if(i == currentBucket.length){
        currentBucket = buckets.shift();
        for(var j = 0; j < currentBucket.length; j++){
          try{
            fs.unlinkSync('./tmp/' + currentBucket[j].filename);
            if(vid.image){
              fs.unlinkSync('./tmp/' + currentBucket[j].image);
            }
          }
          catch(e){
            logger.error("An error occured trying to remove video file " + vid + "\nError: " + e);
          }
        }
        buckets.push([]);
        playlist.unlock();
        playlist.write(buckets).then((res) => playlist.unlock());
        i = 0;
      }
      var vid = currentBucket[i];
      if(!vid.played){
        vid.played = "playing";
        playlist.unlock();
        playlist.write(buckets).then((res) => {
          console.log("Playing: " + vid.title);
          logger.log("Playing video " + vid);
          playlist.unlock();
          play(vid);
        });
      }
      else if(vid.played == "downloading"){
        playlist.unlock();
        console.log("Awaiting download.");
      }
    }
    else{
      console.log("No videos to play.");
      playlist.unlock();
    }
  });
}, 2000);


function play(vid){
  var maxLength = admin.getConfig().bucketLength;
  var stoptime = maxLength;
  if(vid.toFillTime){
    stoptime = vid.toFillTime;
    if(vid.startTime)
      stoptime += startTime;
  }
  else if(vid.endTime)
    stoptime = Math.min(vid.endTime, maxLength);
  if(vid.image){
    exec.exec("vlc tmp/" + vid.image + " -f --no-video-title-show --play-and-exit --no-qt-fs-controller --image-duration " + runtime + (vid.startTime ? ' --start-time ' + vid.startTime :''));
    exec.execSync("cvlc --demux=avformat,none --codec=avcodec,all -ldummy --play-and-exit --stop-time " + runtime + " --global-key-quit Esc " + (vid.startTime ? '--start-time ' + vid.startTime :'') + " --no-qt-fs-controller tmp/" + vid.filename);
    exec.execSync('pkill vlc');
  }
  else
    exec.execSync("vlc --demux=avformat,none --codec=avcodec,all -f --no-video-title-show --play-and-exit --stop-time " + stoptime + " --global-key-quit Esc " + (vid.startTime ? '--start-time ' + vid.startTime :'') + " --no-qt-fs-controller tmp/" + vid.filename);
  playlist.read().then((buckets) => {
    currentBucket = buckets[0];
    vid = currentBucket[i];
    vid.played = "done";
    playlist.unlock();
    logger.log("Video ended " + vid);
    playlist.write(buckets).then((res) => playlist.unlock());
    i++;
  });
  console.log("Done");
};
