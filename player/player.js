var fs = require('fs');
var child = require('child_process');
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
    const vlcImg = child.spawn('vlc', ['tmp/' + vid.image, '-f', '--no-vide-title-show', '--play-and-exit', 'image-duration', 'stoptime']);
    const vlcVid = child.spawnSync('vlc', ['--demux=avformat,none', '--codec=avcodec,all', '--play-and-exit', '--stop-time=' + stoptime, '--global-key-quit=Esc', '--start-time=' + startTime, '--no-qt-fs-controller', 'tmp/' + vid.filename], {windowsHide:true});
    //exec.exec("vlc tmp/" + vid.image + " -f --no-video-title-show --play-and-exit " +
    //"--no-qt-fs-controller --image-duration " + stoptime +
    //(vid.startTime ? ' --start-time ' + vid.startTime :''), {windowsHide: true});
    //exec.execSync("vlc --demux=avformat,none --codec=avcodec,all --play-and-exit --stop-time " + stoptime + " --global-key-quit Esc " + (vid.startTime ? '--start-time ' + vid.startTime :'') + " --no-qt-fs-controller tmp/" + vid.filename, {windowsHide:true});
    const kill = child.spawn('pkill', ['vlc']);
  }
  else{
    if(fs.existsSync("tmp/" + vid.filename)){
      const vlcVid = child.spawnSync('vlc', [ '-f', '--demux=avformat,none', '--codec=avcodec,all', '--play-and-exit', '--stop-time=' + stoptime, '--global-key-quit', 'Esc', '--start-time', 'startTime', '--no-qt-fs-controller', 'tmp/' + vid.filename], {windowsHide:true,stdio:'inherit'});
      //exec.execSync("vlc --demux=avformat,none --codec=avcodec,all -f --no-video-title-show --play-and-exit --stop-time " + stoptime + " --global-key-quit Esc " + (vid.startTime ? '--start-time ' + vid.startTime :'') + " --no-qt-fs-controller tmp/" + vid.filename);
    }
    else{
      console.log("Unable to play " + vid.filename);
    }
  }
  playlist.read().then((buckets) => {
    currentBucket = buckets[0];
    vid = currentBucket[i];
    vid.played = "done";
    playlist.unlock();
    logger.log("Video ended " + JSON.stringify(vid));
    playlist.write(buckets).then((res) => playlist.unlock());
    i++;
  });
  console.log("Done");
};

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
