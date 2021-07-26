const fs = require('fs');
const child = require('child_process');
const admin = require('../server/admin.js');
const logger = require('../log/logger.js');
let bucketManager;
let currentBucket;
let buckets;
let playing = false;
// let vid;
// let pid = -1;
let i = 0;
// var lock = false;
let vlcVid;
let vlcImg;

module.exports = {
		setManager: function (bucketManager){
				this.bucketManager = bucketManager;
		}
}

setInterval(function(){
		if(!playing){
				bucketManager.getBuckets().then(buckets => {
				currentBucket = buckets[0];
				if(currentBucket.length != 0){
						if(i == currentBucket.length){
								currentBucket = buckets.shift();
								bucketManager.clearBucket(currentBucket);
								buckets.push([]);
								i = 0;
						}
						let vid = currentBucket[i];
						if(!vid.played){
								console.log("Playing: " + vid.title);
								logger.log("Playing video " + vid);
								playing = true;
								play(vid);
						}
						else if(vid.played == "downloading"){
								console.log("Awaiting download.");
								bucketManager.unlock();
						}
				}
				else{
						console.log("No videos to play.");
						bucketManager.unlock();
				}
				});
		}
}, 2000);


function play(vid){
		let vidArgList = ['--demux=avformat,none',
											'--codec=avcodec,all',
											'--play-and-exit',
											'--stop-time=',
											'--global-key-quit=Esc',
											'--start-time=',
											'--no-video-title-show',
											'--no-qt-fs-controller',
											'--norm-buff-size=10',
											'--norm-max-level=3.0'];
		let maxLength = admin.getConfig().bucketLength;
		let stoptime = maxLength;
		let startTime = 0;
		if(vid.startTime){
				startTime = vid.startTime;
		}
		if(vid.toFillTime){
				stoptime = vid.toFillTime;
				if(vid.startTime){
						stoptime += startTime;
				}
		}
		else if(vid.endTime){
				stoptime = Math.min(vid.endTime, maxLength);
		}
		vid.played = Date.now();
		bucketManager.writeBuckets(buckets);
		vidArgList[3]+=stoptime;
		vidArgList[5]+=startTime;
		vidArgList.push('tmp/'+vid.filename);
		if(vid.image){
				vidArgList.unshift('--no-video');
				vlcVid = child.spawn('vlc', vidArgList, {detached: true, windowsHide:true, stdio:'ignore'});
				vlcImg = child.spawn('vlc', ['-f', '--no-video-title-show', '--play-and-exit', '--image-duration=' + stoptime, '--no-qt-fs-controller', 'tmp/' + vid.image], {detached: true, stdio: 'ignore'});
		}
		else{
				if(fs.existsSync("tmp/" + vid.filename)){
						vidArgList.unshift('-f');
						vlcVid = child.spawn('vlc', vidArgList, {detached: true, windowsHide:true, stdio:'ignore'});
				}
				else{
						console.log("Unable to play " + vid.filename);
				}
		}
		vlcVid.on('exit', async(code,signal) => {
				if(vlcImg){
						vlcImg.kill();
				}
				bucketManager.getBuckets().then(buckets => {
						currentBucket = buckets[0];
						vid = currentBucket[i];
						vid.played = "done";
						logger.log("Video ended " + JSON.stringify(vid));
						i++;
						console.log("Done");
						bucketManager.writeBuckets(buckets);
						playing = false;
				});
		});
}
