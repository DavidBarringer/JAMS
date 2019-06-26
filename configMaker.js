var jsonfile = require('jsonfile');
var rlSync = require ('readline-sync');
var port = 8080;
var bucketNum = 5;
var bucketVideos = 5;
var bucketLength = 547;
var password = "";
var crypto = require('crypto');
var cont = false;
var salt = new Date();
while(!cont){
  var answer = rlSync.question("Port to run server on (Default: 8080): ");
  if(!answer)
    cont = true;
  else if(Number.isInteger(Number(answer)) && answer > 0){
    port = answer;
    cont = true;
  }
  else{
    console.log("Input is not valid, please try again");
  }
}
cont = false;
while(!cont){
  var answer = rlSync.question("Number of buckets (Default: 5): ");
  if(!answer)
    cont = true;
  else if(Number.isInteger(Number(answer)) && answer > 0){
    bucketNum = answer;
    cont = true;
  }
  else{
    console.log("Input is not valid, please try again");
  }
}
cont = false;
while(!cont){
  var answer = rlSync.question("Max number of videos per person per bucket (Default: 5): ");
  if(!answer)
    cont = true;
  else if(Number.isInteger(Number(answer)) && answer > 0){
    bucketVideos = answer;
    cont = true;
  }
  else{
    console.log("Input is not valid, please try again");
  }
}
cont = false;
while(!cont){
  var answer = rlSync.question("Max length (in seconds) of videos per person per bucket (Default: 547): ");
  if(!answer)
    cont = true;
  else if(Number.isInteger(Number(answer)) && answer > 0){
    bucketLength = answer;
    cont = true;
  }
  else{
    console.log("Input is not valid, please try again");
  }
}
cont = false;
while(!cont){
  var answer = rlSync.question("Enter an admin password: ", {
    hideEchoBack: true
  });
  if(!answer){
    console.log("No password entered");
    continue;
  }
  else{
    var confirm = rlSync.question("Re-enter password: ",{
      hideEchoBack: true
    });
    if(confirm === answer){
      var hash = crypto.createHash('sha256');
      hash.update(answer+salt);
      password = hash.digest('hex');
      cont = true;
    }
    else{
      console.log("Passwords do not match");
    }
  }
}
var config = {
  port: port,
  bucketNum: bucketNum,
  bucketVideos: bucketVideos,
  bucketLength: bucketLength,
  password: password,
  salt: salt
};
jsonfile.writeFileSync('config.json', config);
console.log("Config has been written");
