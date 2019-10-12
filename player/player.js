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
var buckets = [[]];
var lock = false;

process.on('message', (msg) => {
  if(msg.cmd == "KILL"){
    try{
      vlcVid.kill();
    }
    catch(e){}
  }
  if(msg.cmd == "UPDATE"){
    buckets = msg.buckets;
  }
  if(msg.cmd == "LOCK"){
    lock = true;
  }
  if(msg.cmd == "UNLOCK"){
    lock = false;
  }
});

setInterval(function(){
  if(!playing){
    while(lock){
      setTimeout(function(){},1000);
    }
    currentBucket = buckets[0];
    if(currentBucket.length != 0){
      if(i == currentBucket.length){
        process.send({cmd:"LOCK"});
        currentBucket = buckets.shift();
        clearBucket(currentBucket);
        buckets.push([]);
        process.send({cmd:"UPDATE", buckets:buckets});
        process.send({cmd:"UNLOCK"});
        i = 0;
      }
      var vid = currentBucket[i];
      if(!vid.played){
        console.log("Playing: " + vid.title);
        logger.log("Playing video " + vid);
        playing = true;
        play(vid);
      }
      else if(vid.played == "downloading"){
        console.log("Awaiting download.");
      }
    }
    else{
      console.log("No videos to play.");
    }
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
  process.send({cmd:"LOCK"});
  vid.played = Date.now();
  process.send({cmd:"UPDATE", buckets:buckets});
  process.send({cmd:"UNLOCK"});
  if(vid.image){
    const vlcImg = child.spawn('vlc', ['-f', '--no-video-title-show', '--play-and-exit', '--image-duration=' + stoptime, '--no-qt-fs-controller', 'tmp/' + vid.image], {stdio: 'ignore'});
    const vlcVid = child.spawn('vlc', ['--demux=avformat,none', '--codec=avcodec,all', '--play-and-exit', '--stop-time=' + stoptime, '--global-key-quit=Esc', '--start-time='+startTime, '--no-qt-fs-controller', 'tmp/' + vid.filename], {windowsHide:true});
    exitCheck(vlcVid,vlcImg);
  }
  else{
    if(fs.existsSync("tmp/" + vid.filename)){
      const vlcVid = child.spawn('vlc', [ '-f', '--no-video-title-show', '--demux=avformat,none', '--codec=avcodec,all', '--play-and-exit', '--stop-time=' + stoptime, '--global-key-quit', 'Esc', '--start-time=' + startTime, '--no-qt-fs-controller', 'tmp/' + vid.filename], {windowsHide:true,stdio:'ignore'});
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
    while(lock){}
    process.send({cmd:"LOCK"});
    currentBucket = buckets[0];
    vid = currentBucket[i];
    vid.played = "done";
    logger.log("Video ended " + JSON.stringify(vid));
    process.send({cmd:"UPDATE", buckets:buckets});
    i++;
    console.log("Done");
    process.send({cmd:"UNLOCK"});
    playing = false;
  });
}

function clearBucket(bucket){
  for(var j = 0; j < bucket.length; j++){
    logger.log(JSON.stringify(bucket[j].filename));
    try{
      fs.unlinkSync('./tmp/' + bucket[j].filename);
      if(bucket[j].image){
        fs.unlinkSync('./tmp/' + bucket[j].image);
        logger.log(JSON.stringify(bucket[j].image));
      }
    }
    catch(e){
      logger.error("An error occured trying to remove video file " + JSON.stringify(bucket[j].filename) + "\nError: " + e);
    }
  }
}
