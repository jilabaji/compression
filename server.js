var express = require('express');
var multer  = require('multer');
var fs  = require('fs');
const cookieParser = require('cookie-parser');
const sharp = require('sharp');
const path = require('path');

var app = express();
app.use(express.static('public'))
app.set('view engine', 'ejs');
// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Use cookie-parser middleware
app.use(cookieParser());


app.get('/', (req, res) => {
    const alert = req.cookies.alert ? req.cookies.alert : "";
    
    var originalImage = fs.statSync("./uploads/img1.jpg");
    var compressedImage = fs.statSync("./uploads/img1_compressed.jpg");
    res.render('index',{alert: alert ? JSON.parse(alert) : null,oisize: (originalImage.size  / (1024*1024)).toFixed(2),compsize: (compressedImage.size  / (1024*1024)).toFixed(2), });
});

var storage = multer.diskStorage({
    destination: function (req, file, callback) {
        var dir = './uploads';
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir);
        }
        callback(null, dir);
    },
    filename: function (req, file, callback) {
        let filename = `img1.jpg`;
        // console.log(file.originalname)
        // console.log(file)
        callback(null, filename);
    }
});

// File filter to allow only PNG images
var fileFilter = function (req, file, callback) {
    if (file.mimetype === 'image/jpeg') {
        callback(null, true); // Accept the file
    } else {
        callback(new Error('Only .png files are allowed!'), false); // Reject the file
    }
};

var upload = multer({storage: storage,fileFilter: fileFilter }).array('files', 12);
app.post('/upload', function (req, res, next) {
    upload(req, res, async function (err) {
        if (err) {
            let data = { error_flag:true, message:"We Accept only JPG"}
            res.cookie('alert', JSON.stringify(data), {
                maxAge: 30 * 1000, // 30 seconds in milliseconds
            });
            res.redirect('/')
        } else{
            await sharp('./uploads/img1.jpg')
                .resize({ width: 1080 }) // Resize to a max width of 1080px
                .jpeg({ quality: 75 })  // Compress with quality 80
                .toFile(`./uploads/img1_compressed.jpg`);

            let data = { error_flag:false, message:"File upload success"}
            res.cookie('alert', JSON.stringify(data), {
                maxAge: 30 * 1000, // 30 seconds in milliseconds
            });
            res.redirect('/')
        }
    });
})

app.listen(3001);