const config = require('./config.js');
const request = require('request');
const fs = require('fs');


// ------------------------------------------------ System variables -------------------------------------------------
const userID = config.userID;
const cookie = config.cookie;

const headers = {
    'authority': 'i.instagram.com',
    'pragma': 'no-cache',
    'cache-control': 'no-cache',
    'sec-ch-ua': '" Not A;Brand";v="99", "Chromium";v="96", "Google Chrome";v="96"',
    'x-ig-www-claim': 'hmac.AR0G8A7oyAdA603hSAtub-bxrYLlOs9wvXzvZODg8J9Vc7Zt',
    'sec-ch-ua-mobile': '?0',
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.55 Safari/537.36',
    'accept': '*/*',
    'x-asbd-id': '198387',
    'sec-ch-ua-platform': '"macOS"',
    'x-ig-app-id': '936619743392459',
    'origin': 'https://www.instagram.com',
    'sec-fetch-site': 'same-site',
    'sec-fetch-mode': 'cors',
    'sec-fetch-dest': 'empty',
    'referer': 'https://www.instagram.com/',
    'accept-language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
    'Cookie': cookie
};


const trayUrl = `https://i.instagram.com/api/v1/highlights/${userID}/highlights_tray/`;
const url = 'https://i.instagram.com/api/v1/feed/reels_media/?reel_ids=';

// --------------------------------------------- End Of System variables ---------------------------------------------

// ------------------------------------------------------ Code -------------------------------------------------------

createFolderIfNotExists('./instagram');
getTrays();

// ---------------------------------------------------- Functions ----------------------------------------------------

function getTrays() {
    request({
        url: trayUrl,
        headers: headers,
        json: true
    }, function (error, response, body) {
        if (error) {
            console.log('Error: ' + error);
        } else {
            let trayIds = body.tray.map(tray => tray.id);
            getStoryVideos(trayIds);
        }
    });
}


function downloadFileToPath(url, path) {
    return new Promise(function(resolve, reject) {
        request(url).pipe(fs.createWriteStream(path)).on('close', resolve);
    });
}

function createFolder(path) {
    return new Promise(function(resolve, reject) {
        fs.mkdir(path, resolve);
    });
}

function createFolderIfNotExists(path) {
    return new Promise(function(resolve, reject) {
        fs.stat(path, function(err, stats) {
            if (err) {
                createFolder(path).then(resolve);
            } else {
                resolve();
            }
        });
    });
}

function getStoryVideos(storyIds) {
    for (let i = 0; i < storyIds.length; i++) {
        let storyVideos = [];
        let storyImages = [];
        let storyId = storyIds[i];
        requestWithHeaders(url+storyId, headers).then(
            function(response) {
                let json = JSON.parse(response);
                let items = json.reels_media[0].items;
                items.forEach(function(item) {

                    try {

                        if (item.video_versions == undefined) {
                            let image = {
                                id: item.id,
                                image: item.image_versions2.candidates[0].url
                            };
                            storyImages.push(image);
                        } else {
                            let video = {
                                id: item.id,
                                video: item.video_versions[0].url
                            };
                            storyVideos.push(video);
                        }

                    } catch (e) {
                        //console.log(e);
                    }

                });

                createFolderIfNotExists('./instagram/'+storyId).then( () => {
                        storyImages.forEach((image) => {
                            downloadFileToPath(image.image, './instagram/'+storyId+'/'+image.id+'.jpg').then(() => {
                                console.log('downloaded '+image.id);
                            });
                        });
                        storyVideos.forEach((video) => {
                            downloadFileToPath(video.video, './instagram/'+storyId+'/'+video.id+'.mp4').then(() => {
                                console.log('downloaded '+video.id);
                            });
                        });
                });

            },
            function(error) {
                console.log(error);
            }
        );
    }
}

function requestWithHeaders(url, headers) {
    return new Promise((resolve, reject) => {
        let options = {
            url: url,
            headers: headers
        };
        request(options, (error, response, body) => {
            if (error) {
                reject(error);
            } else {
                resolve(body);
            }
        });
    });
}