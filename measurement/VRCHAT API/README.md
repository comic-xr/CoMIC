
# Collecting Data From VRChat

This project involves using the VRChat API to collect data. The API has many limitation do the fact is not an official VRChat API. Due to this limititation this code may not work in the near future, do to VRChat continues to changes their internal system. For quick fixes for any isses, check with the developers of the API(https://discord.com/invite/qjZE9C9fkB). As mid 2023 this code works. First thing to do is to make sure to have the latest version NodeJS, so old versions might not work. This is are the basic packages that must be install, but they should already be install in this repo. if they aren't preinstall, they must be install manually with the following commands. 
```bash
npm install vrchat
cd node_modules/vrchat
npm install csv-writer
npm install totp-generator
```



Before running we must configure all our scripts. This changes much be done to all the scripts. 
```javascript
const vrchat = require("vrchat");
const axios = require('axios');
const totp = require("totp-generator");
// Step 1. We begin with creating a Configuration, which contains the username


const configuration = new vrchat.Configuration({
    username : '*AddUsername*',
    password : '*Add*'
});
//Step 2. Add an agent 
const axiosConfiguration = axios.create({
    headers: {
        'User-Agent': '**appName/version.0 yourEmail@something.com**'
    }
    //Example:  'User-Agent': 'GMU-vrchat-project/1.0 rsantosg@gmu.edu'
})



    // Step 3. login and authenticate the request properly. 
const login = async()=>{
    let login = await AuthenticationApi.getCurrentUser()
    //This token can be found in Vrchat.com. Most login into your account and set up 2FA.
    //While setting 2FA, click enter manually and the token will appear.
    //If 2FA is already set up, deleted the current 2FA and set up again. 
    
    const token = totp("*AddToken*")
    //Nothing 
    const ver = await AuthenticationApi.verify2FA({"code":token})
    login = await AuthenticationApi.getCurrentUser()
    console.log(login.data)
    
}
login()

```
This configuration have to be added to all files that required for this project and future projects. 
This files require configuration. Some directories to have to be change to your own directory, where the data is going to be save. 
```
track_activity.js
add_friends.js 
paging.js 
instances.js
```
paging.js allows to find all the current active worlds. While instances.js allows to find all the known worlds instances and the number of players. instances.js depends in paging.js to be completed first, before running this can be done throught a python script. 
```Python
#collect.py 
import subprocess
subprocess.Popen(['node','/home/user/Document/node_modules/vrchat/paging.js'], stdout=subprocess.PIPE)
    subprocess.Popen(['node','/home/user/Document/node_modules/vrchat/instances.js'], stdout=subprocess.PIPE)
```
If this need to be run in schedule, either use a simple crontab or Windows Scheduler. 
```bash
#Simple Crontab script example 
0 * * * * cd /home/user/Document/ && /home/ron/botAPI/env/bin/python  /home/user/Document/scripts/collect.py  >> /home/user/Document/scripts/errors/collect_error.txt 2>&1; echo "" /home/user/Document/data/errors
#Example to collect data every hour using crontab. Assuming a python virtual enviroment is being use. 
```
track_activity.js allows to track all friends activity. add_friends.js adds a new friends. DO NO SPAM add friends, this will definely lead to a ban.

How to run each script independently
```bash
*/5 * * * * node /home/user/Document/node_modules/vrchat/track_activity.js >> home/user/Document/scripts/data/errors/friends_activity_log.txt 2>&1; echo "" /home/user/Document/errors
#Running every five minutes. 
```
When using VRCHAT API be mindful, the developer might and will ban you if you abuse the API. 
```

```
