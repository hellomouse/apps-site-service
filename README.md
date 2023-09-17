# Hellomouse Apps Site Queue

A fun Microservice for scraping stuff from sites for Hellomouse Apps

## Features:
- Download webpages as HTML (with assets like CSS, videos, images, etc... embedded as base64), PDF, WEBP (screenshot)
- Special handling for certain websites, currently we have:
   - **Twitter / X:** Tweets are downloaded as HTML + attached media (images, videos)
   - **Reddit:** Posts and comments are downloaded with any attached assets
   - **Soundcloud:** Songs are downloaded with metadata (HTML + audio)
   - **Newgrounds:** Songs are downloaded with metadata (HTML + audio)
   - **Imgur:** Albums and gallerys are downloaded with all images and metadata (HTML + images / videos)
   - **Youtube:** Videos are downloaded (Soon)
   - **Pixiv:** Albums are downloaded (Soon)
   - **Bilibili:** Videos are downloaded (Soon)

## Built With
* ![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
* ![Postgres](https://img.shields.io/badge/postgres-%23316192.svg?style=for-the-badge&logo=postgresql&logoColor=white)
* ![Puppeteer](https://img.shields.io/badge/Puppeteer-%01d8a2.svg?style=for-the-badge&logo=GoogleChrome&logoColor=white)

## Setup

Install dependencies
```
npm install
```

Setup the config. You will need a PostgresSQL database running as well as the `hellomouse-apps-api` server (run the server first to generate the required tables).

There is an example config in the root directory. Copy it and rename it to `config.js`. Here are the properties:

```js
export const dbUser = 'hellomouse_board';  // PostgresSQL user
export const dbIp = '127.0.0.1';           // Postgres Server location
export const dbPort = 5433;                // Postgres Server port 
export const dbPassword = 'my password';   // Postgres Server password
export const dbName = 'hellomouse_board';  // Postgres Server DB name

export const fileDir = './saves';          // Path to store all files, in general, web files are stored under this path/site_downloads/file.ext
```

To setup yt-dlp (optional) you can place your browser cookies in `yt-dlp/yt-cookies.txt` for use in downloading youtube videos, and 
`yt-dlp/bilibili-cookies.txt` for downloading bilibili videos.


Run the server:
```
node index.js
```
