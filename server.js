var express = require('express');
var multer = require('multer');
var fs = require('fs');
var sharp = require('sharp');
var ffmpeg = require('fluent-ffmpeg');
var path = require('path');
const cookieParser = require('cookie-parser');

var app = express();
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(cookieParser());

app.get('/', (req, res) => {
    const alert = req.cookies.alert ? req.cookies.alert : "";
    const videoalert = req.cookies.videoalert ? req.cookies.videoalert : "";

    const originalImagePath = "./uploads/original_file.jpg";
    const compressedImagePath = "./uploads/compressed_original_file.jpg";
    const originalVideoPath = "./uploads/original_file.mp4";
    const compressedVideoPath = "./uploads/compressed_original_file.mp4";
    
    // Helper function to get file size if file exists
    const getFileSize = (filePath) => {
        return fs.existsSync(filePath) 
            ? (fs.statSync(filePath).size / (1024 * 1024)).toFixed(2) 
            : null;
    };
    const data = {
        alert: alert ? JSON.parse(alert) : null,
        videoalert: videoalert ? JSON.parse(videoalert) : null,

        oipath: originalImagePath,
        oisize: getFileSize(originalImagePath),

        comppath: compressedImagePath,
        compsize: getFileSize(compressedImagePath),

        ovpath: originalVideoPath,
        ovsize: getFileSize(originalVideoPath),

        compvpath: compressedVideoPath,
        compvsize: getFileSize(compressedVideoPath),
    };
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.render('index',data);
});

// Multer Storage Configuration
var storage = multer.diskStorage({
    destination: function (req, file, callback) {
        var dir = './uploads';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
        callback(null, dir);
    },
    filename: function (req, file, callback) {
        let extension = path.extname(file.originalname).toLowerCase();
        let filename = `original_file${extension}`;
        callback(null, filename);
    }
});

// Multer File Filters
var imageFileFilter = function (req, file, callback) {
    if (file.mimetype === 'image/jpeg' ) {
        callback(null, true);
    } else {
        callback(new Error('Only .jpg images are allowed!'), false);
    }
};

var videoFileFilter = function (req, file, callback) {
    const allowedMimeTypes = ['video/mp4'];
    // const allowedMimeTypes = ['video/mp4', 'video/mkv', 'video/avi', 'video/mov'];
    if (allowedMimeTypes.includes(file.mimetype)) {
        callback(null, true);
    } else {
        callback(new Error('Only video files are allowed!'), false);
    }
};

// Image Upload Route
var uploadImage = multer({ storage: storage, fileFilter: imageFileFilter }).single('image');

app.post('/upload-image', function (req, res, next) {
    uploadImage(req, res, async function (err) {
        if (err) {
            let data = { error_flag: true, message: "We accept only .jpg and .png images" };
            res.cookie('alert', JSON.stringify(data), {
                maxAge: 30 * 1000,
            });
            res.redirect('/');
        } else {
            const inputPath = req.file.path;
            const outputPath = `./uploads/compressed_${req.file.filename}`;

            try {
                await sharp(inputPath)
                    .resize({ width: 1080 }) // Resize to a max width of 1080px
                    .jpeg({ quality: 75 })  // Compress with quality 75
                    .toFile(outputPath);

                let data = { error_flag: false, message: "Image upload and compression successful" };
                res.cookie('alert', JSON.stringify(data), {
                    maxAge: 30 * 1000,
                });
                res.redirect('/');
            } catch (error) {
                console.error(error);
                let data = { error_flag: true, message: "Image compression failed" };
                res.cookie('alert', JSON.stringify(data), {
                    maxAge: 30 * 1000,
                });
                res.redirect('/');
            }
        }
    });
});

// Video Upload Route
// var uploadVideo = multer({ storage: storage, fileFilter: videoFileFilter }).single('video');
var uploadVideo = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 2 MB size limit for videos
    fileFilter: videoFileFilter
}).single('video');

app.post('/upload-video', function (req, res, next) {
    uploadVideo(req, res, function (err) {
        if (err) {
            let data = { error_flag: true, message: "We accept only video files" };
            res.cookie('videoalert', JSON.stringify(data), {
                maxAge: 30 * 1000,
            });
            res.redirect('/');
        } else {
            const inputPath = req.file.path;
            const outputPath = `./uploads/compressed_${req.file.filename}`;
            let data = { error_flag: false, message: "Video upload and compression InProgress, please refresh this page" };
                res.cookie('videoalert', JSON.stringify(data), {
                maxAge: 30 * 1000,
            });

            ffmpeg(inputPath)
                .output(outputPath)
                .videoCodec('libx264')
                .size('1280x720') // Resize to 720p
                .outputOptions('-crf 28') // Adjust quality (lower is better)
                .on('end', () => {
                    let data = { error_flag: false, message: "Video compression in-Progress, wait for 2 mins and if you are not seeing the video you uploaded please clear the cache and check or use incognito mode" };
                    res.cookie('videoalert', JSON.stringify(data), {
                        maxAge: 30 * 1000,
                    });
                    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');  // Prevent caching
                    res.redirect('/');
                })
                .on('error', (err) => {
                    console.error(err);
                    let data = { error_flag: true, message: "Video compression failed" };
                    res.cookie('videoalert', JSON.stringify(data), {
                        maxAge: 30 * 1000,
                    });
                    res.redirect('/');
                })
                .run();
        }
    });
});

app.listen(3001, () => console.log('Server running on http://localhost:3001'));
