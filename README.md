#JAMS
##What it is
JAMS (Just Another Music Server) is a server for playing music uploaded by people on the local network. It introduces a time-based bucketing system: rather than buckets allowing one upload per user, they let users upload videos with a cumulative time that is less than the bucket's allocation. It supports uploads from any url supported by [youtube-dl](https://rg3.github.io/youtube-dl/) and manual file uploads.

##Installing
Use git clone to download the repository, then run the file `setup.sh` to install the packages and set up the config file. The server can then be run using `start.sh`

##Controls
Song can be skipped by hitting **esc** key on host PC
Server can be closed by using **ctrl-c** on the terminal running the server

#Additional dependencies
Available at the given links or on all good package managers.  
⋅[youtube-dl](https://rg3.github.io/youtube-dl/)(Try to keep as up-to-date as possible)  
⋅[vlc](https://www.videolan.org/vlc/index.en-GB.html)  
⋅[ffmpeg](https://www.ffmpeg.org/)

##License
You may use/modify this music server as much as you like, but you may not attempt to use this software in any way to make any legal entity money.
