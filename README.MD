# Instagram Stories Downloader

this package is a simple tool to download all the Instagram stories from a specific user.


```
npm install
cp config.js.template config.js
```

Update the `config.js` file with the userID to fetch the stories from, and a valid authentication cookie.  

Then

```
node index.js
```

- First, all the stories will be downloaded in the `./temp` directory.
- Then, each story will be moved into the coresponding `./instagram` subdirectory, only if not already present.
(presence is checked by the file md5 hash)

## Warning
This project relies on the Instagram API, and is not endorsed or certified by Instagram.  
The used APIs are private and may change without notice.
