var SpeechToTextV1 = require('watson-developer-cloud/speech-to-text/v1');
var fs = require('fs');
var path = require('path');
var mime = require('mime');
var express    = require('express');        
var app        = express();                 
var bodyParser = require('body-parser');
var busboy = require('connect-busboy');
var cfenv = require('cfenv');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(busboy());

var appEnv = cfenv.getAppEnv();   

var router = express.Router();

var speech_to_text = new SpeechToTextV1 ({
  "url": "https://stream.watsonplatform.net/speech-to-text/api",
  "username": "531ca743-35fa-4aad-952d-3e32222fe13f",
  "password": "lleVzwTMptIc"
});

function speechToText(params, res) {
    var recognizeStream = speech_to_text.createRecognizeStream(params);

    fs.createReadStream('audio.wav').pipe(recognizeStream);

    recognizeStream.pipe(fs.createWriteStream('texto.txt'));

    recognizeStream.setEncoding('utf8');

    recognizeStream.on('results', function(event) { onEvent('Results:', event); });
    recognizeStream.on('data', function(event) { onEvent('Data:', event); });
    recognizeStream.on('error', function(event) { onEvent('Error:', event); });
    recognizeStream.on('close', function(event) { 
      var file = __dirname + '/texto.txt';
      var filestream = fs.createReadStream(file);
      filestream.pipe(res);
      onEvent('Close:', event);
    });
    recognizeStream.on('speaker_labels', function(event) { onEvent('Speaker_Labels:', event); });
}

// Displays events on the console.
function onEvent(name, event) {
  console.log(name, JSON.stringify(event, null, 2));
};

app.all('/', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  next();
});

app.route('/sttext')
    .post(function (req, res, next) {

        var fstream;
        req.pipe(req.busboy);
        req.busboy.on('file', function (fieldname, file, filename) {
            console.log("Uploading: " + filename);

            //Path where image will be uploaded
            fstream = fs.createWriteStream(__dirname + '/audio.wav');
            file.pipe(fstream);
            fstream.on('close', function () {    
                var params = {
                    model: 'pt-BR_BroadbandModel',
                    content_type: 'audio/wav',
                    continuous: true,
                    'interim_results': true,
                    'max_alternatives': 3,
                    'word_confidence': false,
                    timestamps: false,
                    keywords: ['oi'],
                    'keywords_threshold': 0.5
                };

                speechToText(params, res);
            });
        });
    });

app.get('/voices', function(req, res){
  speech_to_text.getModels(null, function(error, models) {
    if (error)
      res.write(error);
    else
      res.write(JSON.stringify(models, null, 2));
      res.end();
  });
});

app.listen(appEnv.port, appEnv.bind, function() {

	// print a message when the server starts listening
  console.log("server starting on " + appEnv.url);
});