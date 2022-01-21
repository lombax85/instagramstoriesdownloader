const config = require('./config.js');
const request = require('request');
const fs = require('fs');
const md5File = require('md5-file')


// ------------------------------------------------ System variables -------------------------------------------------
const userID = config.userID;
const cookie = config.cookie;
const downloadPath = config.downloadPath;
const savePath = config.savePath;

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

createFolderIfNotExists(downloadPath);
getTrays().then(
    async (trayIDs) => {

        // get all downloaded files
        let downloadedFiles = getAllFiles(removeTrailingSlash(downloadPath));
        let downloadedFileMap = downloadedFiles.map((file) => {
            return {
                fileName: fileName(file),
                filePath: file,
                folder: file.replace(fileName(file), ''),
                md5: md5File.sync(file)
            }
        });

        // get all saved files
        let savedFiles = getAllFiles(removeTrailingSlash(savePath));
        let savedFileMap = savedFiles.map((file) => {
            return {
                fileName: fileName(file),
                filePath: file,
                folder: file.replace(fileName(file), ''),
                md5: md5File.sync(file)
            }
        });

        // for every downloaded file, check if it is already saved
        // if not, save it
        for (const file of downloadedFileMap) {
            let isSaved = savedFileMap.find((savedFile) => {
                return savedFile.md5 === file.md5;
            });
            if (!isSaved) {
                await copyFileAndCreateDirectoryIfNotExists(file.filePath, savePath + file.folder.replace(downloadPath, '') + file.fileName);
            }
        }

        // empty the temp folder
        await deleteAllFilesInFolder(downloadPath);
        await deleteAllFoldersInFolder(downloadPath);
    }
);





// ---------------------------------------------------- Functions ----------------------------------------------------

function removeTrailingSlash(url) {
    return url.replace(/\/$/, '');
}

async function copyFileAndCreateDirectoryIfNotExists(source, target) {
    await createFolderIfNotExists(target.replace(fileName(target), ''));
    fs.copyFile(source, target, (err) => {
        if (err) throw err;
    });
}

async function deleteAllFilesInFolder(folder) {
    let files = await getAllFiles(folder);
    for (const file of files) {
        fs.unlink(file, (err) => {
            if (err) throw err;
        });
    }
}

async function deleteAllFoldersInFolder(folder) {
    let folders = await getAllFolders(folder);
    for (const folder of folders) {
        fs.rmdir(folder, { recursive: true }, (err) => {
            if (err) throw err;
        });
    }
}


function getAllFiles(dir, files_) {
    files_ = files_ || [];
    var files = fs.readdirSync(dir);
    for (var i in files) {
        var name = dir + '/' + files[i];
        if (fs.statSync(name).isDirectory()) {
            getAllFiles(name, files_);
        } else {
            files_.push(name);
        }
    }
    return files_;
}

function getAllFolders(dir, folders_) {
    folders_ = folders_ || [];
    var files = fs.readdirSync(dir);
    for (var i in files) {
        var name = dir + '/' + files[i];
        if (fs.statSync(name).isDirectory()) {
            folders_.push(name);
            getAllFolders(name, folders_);
        }
    }
    return folders_;
}

function fileName(url) {
    return url.split('/').pop();
}

function getTrays() {
    return new Promise((resolve,reject) => {
        request({
            url: trayUrl,
            headers: headers,
            json: true
        }, async (err, res, body) => {
            if (err) {
                reject(err);
            } else {
                let tray = body
                let trayIds = tray.tray.map((tray) => {
                    return tray.id;
                });
                await getStoryVideos(trayIds);
                resolve(trayIds);
            }
        });
    });
}


async function downloadFileToPath(url, path) {
    return new Promise(function(resolve, reject) {
        request(url).pipe(fs.createWriteStream(path)).on('close', resolve);
    });
}

function createFolder(path) {
    return new Promise(function(resolve, reject) {
        fs.mkdir(path, resolve);
    });
}

async function createFolderIfNotExists(path) {
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

async function getStoryVideos(storyIds) {
    for (let i = 0; i < storyIds.length; i++) {
        let storyVideos = [];
        let storyImages = [];
        let storyId = storyIds[i];
        await requestWithHeaders(url+storyId, headers).then(
            async function (response) {
                let json = JSON.parse(response);
                let items = json.reels_media[0].items;
                items.forEach(function (item) {

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

                await createFolderIfNotExists(downloadPath + storyId).then(() => {
                    storyImages.forEach(async (image) => {
                        downloadFileToPath(image.image, downloadPath + storyId + '/' + image.id + '.jpg').then(() => {
                            console.log('downloaded ' + image.id);
                        });
                    });
                    storyVideos.forEach(async (video) => {
                        downloadFileToPath(video.video, downloadPath + storyId + '/' + video.id + '.mp4').then(() => {
                            console.log('downloaded ' + video.id);
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