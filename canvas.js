
/*

tensorflowjs_converter \
    --input_format=keras_saved_model \
    ./my_model \
    ./web_model
    

terminal: http-server -c1 --cors .
*/
var Tuio = require("../../src/Tuio");
    Tuio.Client = require("../../src/TuioClient");
    var TuioCanvas = {
    init: function() {
        this.Main.init();
    }
}



const tf = require('@tensorflow/tfjs');
const MODEL_URL = 'http://127.0.0.1:8080/model.json';
let model;
async function loadmodel() {

    model= await tf.loadLayersModel(MODEL_URL)
    console.log(model)

}

loadmodel().then(()=>{
    let A=
        [ [0.2,0.1],
            [0.2,0.1],
            [0.2,0.1],
            [0.2,0.1],
            [0.2,0.1],
            [0.2,0.1],
            [0.2,0.1],
            [0.2,0.1],
            [0.2,0.1],
            [0.2,0.1],
            [0.2,0.1],
            [0.2,0.1],
            [0.2,0.1],
            [0.2,0.1],
            [0.2,0.1],
            [0.2,0.1],
            [0.2,0.1],
            [0.2,0.1],
            [0.2,0.1],
            [0.2,0.1],
            [0.2,0.1],
            [0.2,0.1],
            [0.2,0.1],
            [0.2,0.1],
            [0.2,0.1],
            [0.2,0.1],
            [0.2,0.1],
            [0.2,0.1],
            [0.2,0.1],
            [0.2,0.1]]
    let md=tf.tensor3d(
        [A]
    )
    md.print()
    for (let i=0;i<30;i++) {
        let s = model.predict(md).arraySync()
        B = [];
        for (let j = 0; j < 29; j++)
            B[j] = A[j + 1];
        B[29]=s[0];
        A=B;
        md=tf.tensor3d([A])
        md.print()
        console.log(s)
    }

})



TuioCanvas.Main = (function() {
    var client = null,
    screenW = null,
    screenH = null,
    time = null,
    canvas = null,
    context = null,
    objSize = 200,

    init = function() {
        screenW = $(window).innerWidth();
        screenH = $(window).innerHeight();
        time = new Date().getTime();
        canvas = $("#tuioCanvas").get(0);
        canvas.width = screenW;
        canvas.height = screenH;
        context = canvas.getContext("2d");

        initClient();
    },

    initClient = function() {
        client = new Tuio.Client({
            host: "ws://localhost:8080"
        });
        client.on("connect", onConnect);
        client.connect();
    },

    onConnect = function() {
        draw();
    },

    draw = function() {
        requestAnimationFrame(draw);

        context.fillStyle = "#000000";
        context.fillRect(0, 0, canvas.width, canvas.height);

        var cursors = client.getTuioCursors(),
            pointers = client.getTuioPointers(),
            objects = client.getTuioObjects();

        for (var i in pointers) {
            drawCursor(pointers[i]);
        }

        for (var i in cursors) {
            drawCursor(cursors[i]);
        }

        for (var i in objects) {
            drawObject(objects[i]);
        }
    },

    drawCursor = function(cursor) {
        context.fillStyle = "#009fe3";
        context.beginPath();
        context.arc(
            cursor.getScreenX(screenW),
            cursor.getScreenY(screenH),
            objSize * 0.5,
            0,
            Math.PI * 2
        );
        context.closePath();
        context.fill();
    },

    drawObject = function(object) {
        context.save();

        context.translate(
            object.getScreenX(screenW) + objSize * 0.5, 
            object.getScreenY(screenH) + objSize * 0.5
        );
        context.rotate(object.getAngle());

        context.fillStyle = "#ffffff";
        context.fillRect(-objSize * 0.5, -objSize * 0.5, objSize, objSize);

        context.restore();
    };

    return {
        init: init
    };
}());

/*
$(function() {
    TuioCanvas.init();
});
*/
