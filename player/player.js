var fs = require('fs');
var child = require('child_process');
var playlist = require('./playlist.js');
var admin = require('../server/admin.js');
var logger = require('../log/logger.js');
var currentBucket;
var playing = false;
var vid;
var pid = -1;
var i = 0;


setInterval(function(){
  if(!playing){
    playlist.read().then((buckets) => {
      currentBucket = buckets[0];
      if(currentBucket.length != 0){
        if(i == currentBucket.length){
          currentBucket = buckets.shift();
          clearBucket(currentBucket);
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
            playing = true;
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
  }
}, 2000);


async function play(vid){
  var maxLength = admin.getConfig().bucketLength;
  var stoptime = maxLength;
  var startTime = 0;
  if(vid.startTime){
      startTime = vid.startTime;
  }
  if(vid.toFillTime){
    stoptime = vid.toFillTime;
    if(vid.startTime)
      stoptime += startTime;
  }
  else if(vid.endTime)
    stoptime = Math.min(vid.endTime, maxLength);
  if(vid.image){
    const vlcImg = child.spawn('vlc', ['-f', '--no-video-title-show', '--play-and-exit', '--image-duration=' + stoptime, '--no-qt-fs-controller', 'tmp/' + vid.image], {stdio: 'inherit'});
    const vlcVid = child.spawn('vlc', ['--demux=avformat,none', '--codec=avcodec,all', '--play-and-exit', '--stop-time=' + stoptime, '--global-key-quit=Esc', '--start-time='+startTime, '--no-qt-fs-controller', 'tmp/' + vid.filename], {windowsHide:true});
    exitCheck(vlcVid,vlcImg);
  }
  else{
    if(fs.existsSync("tmp/" + vid.filename)){
      const vlcVid = child.spawn('vlc', [ '-f', '--no-video-title-show', '--demux=avformat,none', '--codec=avcodec,all', '--play-and-exit', '--stop-time=' + stoptime, '--global-key-quit', 'Esc', '--start-time=' + startTime, '--no-qt-fs-controller', 'tmp/' + vid.filename], {windowsHide:true,stdio:'inherit'});
      exitCheck(vlcVid, false);
    }
    else{
      console.log("Unable to play " + vid.filename);
    }
  }
};

function exitCheck(vlcVid, vlcImg){
  vlcVid.on('exit', (code,signal)=>{
    if(vlcImg){
      vlcImg.kill();
    }
    playlist.read().then((buckets) => {
      currentBucket = buckets[0];
      vid = currentBucket[i];
      vid.played = "done";
      playlist.unlock();
      logger.log("Video ended " + JSON.stringify(vid));
      playlist.write(buckets).then((res) => playlist.unlock());
      i++;
      exit = true;
    });
    console.log("Done");
    playing = false;
  });

  process.on('message', (msg) => {
    console.log(msg);
    if(msg == "KILL"){
      try{
        vlcVid.kill();
      }
      catch(e){}
    }
  });
}

function clearBucket(bucket){
  for(var j = 0; j < bucket.length; j++){
    logger.log(JSON.stringify(bucket[j].filename));
    logger.log(JSON.stringify(bucket[j].image));
    try{
      fs.unlinkSync('./tmp/' + bucket[j].filename);
      if(bucket[j].image){
        fs.unlinkSync('./tmp/' + bucket[j].image);
      }
    }
    catch(e){
      logger.error("An error occured trying to remove video file " + JSON.stringify(bucket[j].filename) + "\nError: " + e);
    }
  }
}
