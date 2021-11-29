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

All the stories will be downloaded in the `./instagram` directory.

## Warning
This project relies on the Instagram API, and is not endorsed or certified by Instagram.  
The used APIs are private and may change without notice.
