<template>
  <div>
    <div v-bind:class="[{altTemplateBody: adminPanel}, {templateBody: !adminPanel}]">
      <div class = "aliasHidden">
        <form v-if="(!aliasHidden)" class="aliasInput" v-on:submit.prevent="addAlias">
          <button class="button">Submit</button>
          <input class="alias input" type="text" v-model="newName" placeholder="choose a new alias" maxlength="32">
        </form>
        <a class="aliasButton" v-bind:title="alias" v-on:click="aliasHidden = !aliasHidden">Alias: {{ alias }}</a>
      </div>
      <br/>
      <div class = "uploadTabs">
        <a v-bind:class="{active: activeTab == 0}" v-on:click="swapTab(0)"><span>URL</span></a>
        <a v-bind:class="{active: activeTab == 1}" v-on:click="swapTab(1)"><span>File</span></a>
      </div>
      <div v-bind:hidden="activeTab != 0" class = "videoSubmission">
        <form v-on:submit.prevent="addUrl">
          <div class="message">
            {{ message }}
          </div>
          <div>
            <input class="input" type="text" v-bind:disabled="uploading" v-model="url" placeholder="enter a url">
            <button class="button" v-bind:disabled="!canUpload">Submit</button>
          </div>
          <div>
            <input type="checkbox" v-model="startCheck" v-bind:disabled="!canUpload">Set start time</input>
            <input class="timeInput" type="text" v-model="startTime" v-bind:disabled="!startCheck" placeholder="mm:ss">
          </div>
          <div>
            <input type="checkbox" v-model="endCheck" v-bind:disabled="!canUpload || toFillCheck">Set end time</input>
            <input class="timeInput" type="text" v-model="endTime" v-bind:disabled="!endCheck" placeholder="mm:ss">
          </div>
          <div>
            <input type="checkbox" v-model="toFillCheck" v-bind:disabled="!canUpload">Set the duration to fill available bucket</input>
          </div>
          <div class = "file has-name">
            <label class="file-label">
              <input class="file-input" accept="image/*" ref = "image" v-on:change="setImage" type="file" name ="">
              <span class="file-cta">
                <span class="file-label">Upload an image</span>
              </span>
              <span v-if="image" class="file-name">{{ image.name }}</span>
            </label>
          </div>
        </form>
      </div>
      <div v-bind:hidden="activeTab != 1" class = "videoSubmission">
        <form v-on:submit.prevent="uploadVideo">
          <div class="file has-name">
            <label class="file-label">
              <input class="file-input" v-bind:disabled="uploading" v-if="(!clearFile)" accept="audio/*,video/*" ref="uploadFile" v-on:change="fileCheck" type="file" name="resume">
              <span class="file-cta">
                <span class="file-label">Upload a video</span>
              </span>
              <span v-if="file" class="file-name">{{ file.name }}</span>
            </label>
            <button class="button" v-bind:disabled="!fCanUpload">Submit</button>
          </div>
          <div class="message">
            {{ fMessage }}
          </div>
          <div>
            <input type="checkbox" v-model="fStartCheck" v-bind:disabled="!fCanUpload">Set start time</input>
            <input class="timeInput" type="text" v-model="fStartTime" v-bind:disabled="!fStartCheck" placeholder="mm:ss">
          </div>
          <div>
            <input type="checkbox" v-model="fEndCheck" v-bind:disabled="!fCanUpload || fToFillCheck">Set end time</input>
            <input class="timeInput" type="text" v-model="fEndTime" v-bind:disabled="!fEndCheck" placeholder="mm:ss">
          </div>
          <div>
            <input type="checkbox" v-model="fToFillCheck" v-bind:disabled="!fCanUpload">Set the duration to fill available bucket</input>
          </div>
          <div class = "file has-name">
            <label class="file-label">
              <input class="file-input" accept="image/*" ref = "fImage" v-on:change="setfImage" type="file" name ="">
              <span class="file-cta">
                <span class="file-label">Upload an image</span>
              </span>
              <span v-if="fImage" class="file-name">{{ fImage.name }}</span>
            </label>
          </div>
        </form>
      </div>
      <div class = "bucket" v-bind:class="[{full: isFull(bucket)},{available: isAvailable(index)}]"v-for="(bucket,index) in items">
        <span class="icon is-medium" v-bind:class="{cFull: tFull(bucket)}"><i class="fas fa-lg fa-stopwatch"></i></span><span class="time" v-bind:class="{cFull: tFull(bucket)}"> - {{ bucketTime(bucket) }}</span>
        <span class="count" v-bind:class="{cFull: cFull(bucket)}">{{ bucketCount(bucket) }}</span>
        <table class="test">
          <thead>
            <th class="title"></th>
            <th class="name"></th>
            <th></th>
          </thead>
          <tbody>
            <template v-for="(song,sIndex) in bucket">
              <tr class="spacer"></tr>
              <tr v-bind:class="{finished: song.played == 'done', playing: isPlaying(song.played)}">
                <td class="title">
                  <a v-if="(song.url)" v-bind:href="song.url">{{ song.title }}</a>
                  <a v-else v-on:click="download(song.title,song.dlId)">{{ song.title }}</a>
                </td>
                <td class="name" v-bind:title="getAlias(song.ip)">{{ getAlias(song.ip) }}</td>
                <td class="adminButton">
                  <button v-if="(song.ip==ip || adminSession==true) && (!song.played)" v-on:click="removeSong(index,sIndex,song.ip)" class="button is-small is-right">Remove</button>
                  <button v-else-if="(song.ip==ip || adminSession==true) && (isPlaying(song.played))" v-on:click="killSong(index,sIndex,song.ip)" class="button is-small is-right">Kill</button>
                </td>
              </tr>
              <tr v-if="(isPlaying(song.played))" style="height:0.5rem">
                <td colspan="3">
                  <div v-bind:style="{width:Math.min(100,(currTime-song.played)/(song.duration*10))+'%'}" style="height:0.25rem; background-color:yellow;"></div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>
    <div class = "bottomPanel">
      <div class="panelButton">
        <button class="button" v-on:click="adminPanel = !adminPanel">
          <span class="icon">
            <i v-if="(!adminPanel)" class="fas fa-chevron-up"></i>
            <i v-else class="fas fa-chevron-down"></i>
          </span>
        </button>
      </div>
      <transition name="slide-in">
        <div v-if="adminPanel" class = "adminPanel">
          <div class="hiddenPanel">
            <span class="adminTitle">
              Admin panel
            </span>
            {{ status }}
            <div v-if="adminSession == false">
              <form v-on:submit.prevent="adminLogin">
                <input class="input is-small" type="password" v-model="password">
                <button class="button is-small">login</button>
              </form>
            </div>
            <div v-else-if="adminSession == true">
              <div class="adminSetting1">
                Number of buckets: {{ adminBucketNum }}
                <button class="button is-small" v-on:click="adminBucketNum > 1 ? adminBucketNum -= 1 : adminBucketNum += 0">
                  <span class = "icon is-small">
                    <i class="fas fa-minus"></i>
                  </span>
                </button>
                <button class="button is-small" v-on:click="adminBucketNum += 1">
                  <span class = "icon is-small">
                    <i class="fas fa-plus"></i>
                  </span>
                </button>
              </div>
              <div class="adminSetting2">
                Max length of bucket:
                {{ timeToString(adminBucketLength) }}
                <button class = "button is-small" @mousedown="dec()" @mouseup="stop()" @mouseleave="stop()" @touchstart="start()" @touchend="stop()" @touchcancel="stop()">
                  <span class = "icon is-small">
                    <i class="fas fa-minus"></i>
                  </span>
                </button>
                <button class = "button is-small" @mousedown="inc()" @mouseup="stop()" @mouseleave="stop()" @touchstart="start()" @touchend="stop()" @touchcancel="stop()">
                  <span class = "icon is-small">
                    <i class="fas fa-plus"></i>
                  </span>
                </button>
              </div>
              <div class="adminSetting3">
                Max number of videos (pp) per bucket: {{ adminBucketVideos }}
                <button class="button is-small" v-on:click="adminBucketVideos > 1 ? adminBucketVideos -= 1 : adminBucketVideos += 0">
                  <span class = "icon is-small">
                    <i class="fas fa-minus"></i>
                  </span>
                </button>
                <button class="button is-small" v-on:click="adminBucketVideos += 1">
                  <span class = "icon is-small">
                    <i class="fas fa-plus"></i>
                  </span>
                </button>
              </div>
              <button class="button is-small adminSubmit" v-on:click="changeConfig()">Submit</button>
              <button class="button is-small " v-on:click="adminLogout">logout</button>
            </div>
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<script>

    export default{
      data:{
        activeTab: 0,
        currTime: Date.now(),

        status: "",
        items: [],
        currentIndex: 0,
        uploading: false,

        adminPanel: false,
        password: "",
        adminSession: false,
        adminBucketLength: 0,
        adminBucketVideos: 0,
        adminBucketNum: 0,
        interval: false,

        ip: "",
        alias: "",
        newName: "",
        aliases: [],
        aliasHidden: true,
        bucketLength: 0,
        bucketVideos: 0,
        bucketNum: 0,

        message: "",
        url: "",
        newVideoName: "",
        newVideoDuration: 0,
        canUpload: false,
        availableBucket: -1,
        startCheck: false,
        endCheck: false,
        toFillCheck: false,
        startTime: "",
        sTime: 0,
        endTime: "",
        eTime: 9*60+7,
        toFillDuration: 0,
        image: "",

        fMessage: "",
        fNewVideoName: "",
        fNewVideoDuration: 0,
        fCanUpload: false,
        fStartCheck: false,
        fEndCheck: false,
        fToFillCheck: false,
        fStartTime: "",
        fSTime: 0,
        fEndTime: "",
        fETime: 9*60+7,
        fToFillDuration: 0,
        file: "",
        fImage: "",
        loc: 0,
        clearFile: false
      },

      watch: {
        url: function (t1, t2) {
          if(this.url != "")
            this.debouncedCheckURL();
          else{
            this.availableBucket = -1;
            this.canUpload = false;
            this.endTime = "";
            this.eTime = 9*60+7;
            this.message = "";
          }
        },
        startTime: function (t1, t2){
          if(this.startTime != "")
            this.debouncedChecksTime();
          else
            this.sTime = 0;
        },
        fStartTime: function (t1, t2){
          if(this.fStartTime != "")
            this.debouncedCheckfSTime();
          else
            this.fSTime = 0;
        },
        endTime: function (t1, t2){
          if(this.endTime != "")
            this.debouncedCheckeTime();
          else
            this.eTime = this.newVideoDuration;
        },
        fEndTime: function (t1, t2){
          if(this.fEndTime != "")
            this.debouncedCheckfETime();
          else
            this.fETime = this.fNewVideoDuration;
        },
        toFillCheck: function(t1, t2){
          if(this.toFillCheck){
            this.findAvailableBucket();
            this.endCheck = false;
            var a = this.bucketTime(this.items[this.availableBucket]).split(':');
            var bTime = a.reduce((acc, time) => (60 * acc) + +time);
            this.toFillDuration = Math.min(bTime, this.newVideoDuration);
          }
          else {
            this.findAvailableBucket();
            this.toFillDuration = 0;
          }
        },
        fToFillCheck: function(t1, t2){
          if(this.fToFillCheck){
            this.findAvailableBucket();
            this.fEndCheck = false;
            var a = this.bucketTime(this.items[this.availableBucket]).split(':');
            var bTime = a.reduce((acc, time) => (60 * acc) + +time);
            this.fToFillDuration = Math.min(bTime, this.fNewVideoDuration);
          }
          else {
            this.findAvailableBucket();
            this.fToFillDuration = 0;
          }
        }
      },

      created: function(){
        var x = this;
        x.debouncedCheckURL = x.$_.debounce(this.checkUrl, 1000);
        x.debouncedChecksTime = x.$_.debounce(this.checksTime, 1000);
        x.debouncedCheckeTime = x.$_.debounce(this.checkeTime, 1000);
        x.debouncedCheckfSTime = x.$_.debounce(this.checkfSTime, 1000);
        x.debouncedCheckfETime = x.$_.debounce(this.checkfETime, 1000);
        x.fetchItems();
        setInterval(function(){
          x.currTime = Date.now();
        }, 500);
        setInterval(function(){
          x.fetchItems();
        }, 2000);
      },

      methods:{
        //Swap active tab for video uploads
        swapTab(index){
          this.activeTab = index;
          if(index == 0 && this.newVideoDuration != 0){
            this.findAvailableBucket();
          }
          else if(index == 1 && this.fNewVideoDuration !=0){
            this.findAvailableBucket();
          }
          else{
            this.availableBucket = -1;
          }
        },

        //Returns if a song is Playing
        isPlaying(check){
          switch (check){
            case 'downloading':
              return 0;
              break;
            case 'done':
              return 0;
              break;
            case false:
              return 0;
              break;
            default:
              return 1;
          }
        },

        //Get buckets
        async fetchItems(){
          this.axios.get("/songs").then((response) => {
            this.getAliases().then((res)=>{
              this.items = response.data.buckets;
              this.ip = response.data.ip;
              this.bucketLength = response.data.config.bucketLength;
              this.bucketVideos = response.data.config.bucketVideos;
              this.bucketNum = response.data.config.bucketNum;
              this.alias = this.getAlias(response.data.ip);
              this.adminSession = response.data.adminSession;
              if(this.adminSession && !(this.adminBucketNum && this.adminBucketLength && this.adminBucketVideos)){
                this.adminBucketNum = this.bucketNum;
                this.adminBucketVideos = this.bucketVideos;
                this.adminBucketLength = this.bucketLength;
              }
            });
          });
        },

        async checkUrl(){
          if(this.url != ""){
            var uploadUrl = this.url;
            var result = this.axios.post("/check",{
              type: "ytdl",
              url: uploadUrl
            }).then((res) => {
              this.newVideoName = res.data.newVideoName;
              this.newVideoDuration = res.data.newVideoDuration;
              this.message = res.data.newVideoName;
              this.endTime = this.timeToString(this.newVideoDuration);
              var a = this.endTime.split(':');
              this.eTime = a.reduce((acc, time) => (60 * acc) + +time);
              this.findAvailableBucket();
            }).catch((err) => {
              this.message = err.response.data;
              this.newVideoName = "";
              this.canUpload = false;
              this.eTime = this.bucketLength;
              this.endTime = "";
              this.newVideoDuration = 0;
              this.availableBucket = -1;
            });
          }
          else{
            this.newVideoName="";
            this.newVideoDuration = 0;
          }
        },
        fileCheck(){
          this.file = this.$refs.uploadFile.files[0];
          if(this.fNewVideoName){
            this.axios.post("/fileCancel", {
              loc: this.loc
            }).then((res)=>{
              this.fMessage = "";
              this.file = "";
              this.loc = -1;
              this.fNewVideoName = "";
              this.fStartTime = "";
              this.fSTime = 0;
              this.fEndTime = "";
              this.fETime = 0;
              this.fStartCheck = false;
              this.fEndCheck = false;
              this.fToFillCheck = false;
              this.fCanUpload = false;
              this.availableBucket = -1;
            }).catch((err) => console.log(err.response.data));
          }
          let formData = new FormData();
          formData.append("file", this.file);
          var res = this.axios.post("/fileCheck", formData, {
            headers:{
              "Content-Type" : "multipart/form-data"
            }
          }).then((response)=>{
            this.fMessage = response.data.name;
            this.fNewVideoName = response.data.name;
            this.fNewVideoDuration = response.data.duration;
            this.fEndTime = this.timeToString(this.fNewVideoDuration);
            var a = this.fEndTime.split(':');
            this.fETime = a.reduce((acc, time) => (60 * acc) + +time);
            this.loc = response.data.loc;
            this.findAvailableBucket();
          }).catch((err) => {
            this.fMessage = err.response.data;
            this.fNewVideoName = "";
            this.fCanUpload = false;
            this.fETime = this.bucketLength;
            this.fEndTime = "";
            this.fNewVideoDuration = 0;
            this.availableBucket = -1;
          });
        },
        setImage(){
          this.image = this.$refs.image.files[0];
        },
        setfImage(){
          this.fImage = this.$refs.fImage.files[0];
        },
        findAvailableBucket(){
          if(this.newVideoDuration === 0){
            this.availableBucket = -1;
            this.canUpload = true;
          }
          else{
            var duration;
            if(this.activeTab === 0)
            duration = this.eTime - this.sTime;
            if(this.activeTab === 1)
            duration = this.fETime - this.fSTime;
            if(duration > this.bucketLength)
            duration = this.bucketLength;
            for (var j = 0; j<this.items.length; j++){
              var time = this.bucketLength;
              var bucket = this.items[j];
              for(var i = 0; i<bucket.length; i++){
                if(this.ip == bucket[i].ip)
                time -= bucket[i].duration;
              }
              if(time > 0 && this.fToFillCheck && this.activeTab == 1){
                this.availableBucket = j;
                this.fCanUpload = true;
                return;
              }
              if(time > 0 && this.toFillCheck && this.activeTab == 0){
                this.availableBucket = j;
                this.canUpload = true;
                return;
              }
              time -= duration;
              if (time >= 0){
                this.availableBucket = j;
                if(this.activeTab == 0)
                this.canUpload = true;
                else
                this.fCanUpload = true;
                return;
              }
            }
            if(this.activeTab == 0)
            this.message = "No space to upload this video";
            else
            this.fMessage = "No space to upload this video";
          }
        },
        async addUrl(){
          this.uploading = true;
          var formData = new FormData;
          formData.set('type', 'url');
          formData.set('url', this.url);
          formData.set('startTime', (this.startCheck ? this.sTime : ''));
          formData.set('endTime', (this.endCheck ? this.eTime : ''));
          formData.set('toFillTime', (this.toFillCheck ? this.toFillDuration : ''));
          if(this.image){
            formData.append('image', this.image);
          }
          this.image = 0;
          this.canUpload = false;
          this.url = "";
          this.newVideoName = "";
          this.startTime = "";
          this.sTime = 0;
          this.endTime = "";
          this.eTime = 0;
          this.startCheck = false;
          this.endCheck = false;
          this.toFillCheck = false;
          this.newVideoDuration = 0;
          var result = this.axios.post("/upload", formData,{
            headers:{
              "Content-Type" : "multipart/form-data"
            }
          }).then((res) => {
            this.$nextTick(() => {
              this.availableBucket = -1;
              this.uploading = false;
            });
            var msg = res.message;
            this.printMessage(msg);
          }
        ).catch((err) => {
          var msg = err.response.data;
          this.printMessage(msg);
          this.uploading = false;
        });
        },
        async uploadVideo(){
          this.uploading = true;
          var formData = new FormData();
          formData.set('type', 'file');
          formData.set('loc', this.loc);
          formData.set('filename', this.fNewVideoName);
          formData.set('duration', this.fNewVideoDuration);
          formData.set('startTime', (this.fStartCheck ? this.fSTime : ''));
          formData.set('endTime', (this.fEndCheck ? this.fETime: ''));
          formData.set('toFillTime', (this.fToFillCheck ? this.fToFillDuration : ''));
          if(this.fImage){
            formData.append('fImage', this.fImage);
          }
          this.file = "";
          this.clearFile = true;
          this.loc = -1;
          this.fNewVideoName = "";
          this.fStartTime = "";
          this.fSTime = 0;
          this.fEndTime = "";
          this.fETime = 0;
          this.fStartCheck = false;
          this.fEndCheck = false;
          this.fToFillCheck = false;
          this.fNewVideoDuration = 0;
          this.fImage = "";
          this.availableBucket = -1;
          var result = this.axios.post("/upload",formData,{
            headers:{
              "Content-Type" : "multipart/form-data"
            }
          }).then((res) => {
            var msg = res.message;
            this.printfMessage(msg);
            this.$nextTick(() => {
              this.availableBucket = -1;
              this.fCanUpload = false;
            	this.clearFile = false;
              this.uploading = false;
            });
          }).catch((err) => {
            var msg = err.response.data;
            this.printfMessage(msg);
            this.uploading = false;
          });
        },

        printMessage(message){
          this.message = message;
          setTimeout(function(){
            this.message = "";
          }, 10000);
        },

        printfMessage(message){
          this.fMessage = message;
          setTimeout(function(){
            this.fMessage = "";
          }, 10000);
        },

        download(title, dlId){
          this.axios({
            url: '/download',
            method: 'GET',
            params:{
              id: dlId
            },
            responseType: 'blob'
          }).then((response) => {
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', title);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          });
        },

        isFull(bucket, additional){
          if(this.bucketTime(bucket) == "0:00" || this.bucketCount(bucket) == "0/" + this.bucketVideos){
            return true;
          }
          return false;
        },

        isAvailable(index){
          return index == this.availableBucket;
        },

        cFull(bucket){
          return this.bucketCount(bucket) == "0/" + this.bucketVideos;
        },

        tFull(bucket, additional){
          return this.bucketTime(bucket) == "0:00";
        },

        removeSong(index,sIndex,ip){
          this.items[index].splice(sIndex,1);
          var result = this.axios.post("/remove",{
            index: index,
            ip: ip,
            sIndex: sIndex
          }).then((res)=>{});
        },

        killSong(x,y,songIp){
          var result = this.axios.post("/kill", {songIp:songIp}).then((res)=>{});
        },

        bucketTime(bucket){
          var time = this.bucketLength;
          for(var i = 0; i < bucket.length; i++){
            if(this.ip == bucket[i].ip)
              time -= bucket[i].duration;
          }
          return this.timeToString(time);
        },

        checksTime(){
          if(!this.url){
            return;
          }
          var regex = /.?.:../;
          if (!regex.test(this.startTime) && this.startTime != ""){
            this.message = "Invalid start time";
            this.canUpload = false;
          }
          else if(this.startTime != ""){
            var a = this.startTime.split(':');
            this.sTime = a.reduce((acc, time) => (60 * acc) + +time);
            if(this.sTime > this.newVideoDuration){
              this.sTime = this.newVideoDuration;
              this.startTime = this.timeToString(this.sTime);
            }
            if(this.sTime > this.eTime){
              this.sTime = this.eTime;
              this.startTime = this.timeToString(this.sTime);
            }
            this.message = this.newVideoName;
            this.findAvailableBucket();
            this.canUpload = true;
          }
          else{
            this.sTime = 0;
            this.findAvailableBucket();
            this.canUpload = true;
          }
        },
        checkfSTime(){
          if(!this.url){
            return;
          }
          var regex = /.?.:../;
          if (!regex.test(this.fStartTime) && this.fStartTime != ""){
            this.fMessage = "Invalid start time";
            this.fCanUpload = false;
          }
          else if(this.fStartTime != ""){
            var a = this.fStartTime.split(':');
            this.fSTime = a.reduce((acc, time) => (60 * acc) + +time);
            if(this.fSTime > this.fNewVideoDuration){
              this.fSTime = this.fNewVideoDuration;
              this.fStartTime = this.timeToString(this.fSTime);
            }
            if(this.fSTime > this.fETime){
              this.fSTime = this.fETime;
              this.fStartTime = this.timeToString(this.fSTime);
            }
            this.fMessage = this.fNewVideoName;
            this.findAvailableBucket();
            this.fCanUpload = true;
          }
          else{
            this.fStime = 0;
            this.findAvailableBucket();
            this.fCanUpload = true;
          }
        },
        checkeTime(){
          if(!this.url){
            return;
          }
          var regex = /.?.:../;
          if (!regex.test(this.endTime) && this.endTime != ""){
            this.message = "Invalid end time";
            this.canUpload = false;
          }
          else if(this.endTime != ""){
            var a = this.endTime.split(':');
            this.eTime = a.reduce((acc, time) => (60 * acc) + +time);
            if(this.eTime > this.newVideoDuration){
              this.eTime = this.newVideoDuration;
              this.endTime = this.timeToString(this.eTime);
            }
            if(this.eTime < this.sTime){
              this.eTime = this.sTime;
              this.endTime = this.timeToString(this.eTime)
            }
            this.message = this.newVideoName;
            this.findAvailableBucket();
            this.canUpload = true;
          }
          else{
            this.eTime = this.newVideoDuration;
            this.endTime = this.timeToString(this.eTime);
            this.findAvailableBucket();
            this.canUpload = true;
          }
        },
        checkfETime(){
          if(!this.url){
            return;
          }
          var regex = /.?.:../;
          if (!regex.test(this.fEndTime) && this.fEndTime != ""){
            this.fMessage = "Invalid end time";
            this.fCanUpload = false;
          }
          else if(this.fEndTime != ""){
            var a = this.fEndTime.split(':');
            this.fETime = a.reduce((acc, time) => (60 * acc) + +time);
            if(this.fETime > this.fNewVideoDuration){
              this.fETime = this.fNewVideoDuration;
              this.fEndTime = this.timeToString(this.fETime);
            }
            if(this.fETime < this.fSTime){
              this.fETime = this.fSTime;
              this.fEndTime = this.timeToString(this.fETime);
            }
            this.fMessage = this.fNewVideoName;
            this.findAvailableBucket();
            this.fCanUpload = true;
          }
          else{
            this.fETime = this.fNewVideoDuration;
            this.fEndTime = this.timeToString(this.fETime);
            this.findAvailableBucket();
            this.fCanUpload = true;
          }
        },
        timeToString(time){
          var mins = Math.floor(time/60);
          var secs = str_pad_left(time - mins*60,'0',2);
          return mins+":"+secs;

          function str_pad_left(string,pad,length) {
            return (new Array(length+1).join(pad)+string).slice(-length);
          }
        },

        bucketCount(bucket){
          var count = 0;
          for(var i = 0; i < bucket.length; i++){
            if(this.ip == bucket[i].ip)
              count++;
          }
          return this.bucketVideos-count + "/" + this.bucketVideos;
        },

        dec(){
          if(!this.interval)
            this.interval = setInterval(() => {
              if(this.adminBucketLength > 1)
                this.adminBucketLength--
            }, 100);
        },

        inc(){
          if(!this.interval)
            this.interval = setInterval(() => this.adminBucketLength++ , 100);
        },

        stop(){
    	    clearInterval(this.interval);
          this.interval=false;
        },

        //Admin commands
        adminLogin(){
          var test = this.password;
          this.password = "";
          this.axios.post("/admin",{
            type: "login",
            password: test
          }).then((res) => {
            this.adminSession = true;
            this.status = "";
            this.adminBucketNum = this.bucketNum;
            this.adminBucketVideos = this.bucketVideos;
            this.adminBucketLength = this.bucketLength;
          })
          .catch((e) => this.status = e.response.data);
        },
        adminLogout(){
          this.axios.post("/admin",{
            type: "logout",
            password: ""
          }).then((res) => {
            this.adminSession = false;
            this.adminBucketNum = 0;
            this.adminBucketVideos = 0;
            this.adminBucketLength = 0;
          });
        },

        changeConfig(){
          this.axios.post("/admin",{
            type: "changeConfig",
            bucketNum : this.adminBucketNum,
            bucketVideos : this.adminBucketVideos,
            bucketLength : this.adminBucketLength
          });
        },

        //Alias commands
        addAlias(){
          this.aliasHidden = true;
          var alias = this.newName.substring(0,32);
          this.newName = "";
          this.axios.post("/alias",{
            type: "set",
            alias: alias
          });
        },
        async getAliases(){
          var res = await this.axios.get("/alias");
          this.aliases = res.data;
        },
        getAlias(ip){
          var user;
          var res = this.aliases.every(function(alias){
            if(alias.ip == ip){
              user = alias.alias;
              return 0;
            }
            else{
              return 1;
            }
          });
          if(!res){
            return user;
          }
          else{
            this.axios.post("/alias",{
              type: "setRand"
            });
          }
        }
      }
    }
</script>
