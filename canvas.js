
/*

tensorflowjs_converter  --input_format=keras_saved_model  ./my_model  ./web_model
    

terminal: http-server -c1 --cors . -p 1234 （8080和tuio信号接口冲突）

4k屏幕 10帧预测5帧
*/


var Tuio = require("../../src/Tuio");
Tuio.Client = require("../../src/TuioClient");

var TuioCanvas = {
    init: function() {
        this.Main.init();
    }
};


let cnt=0;
document.documentElement.addEventListener('touchstart', function (event) {
    if (event.touches.length > 1) {
        event.preventDefault();
    }
}, {passive:false});






let positions=[]

const tf = require('@tensorflow/tfjs');


const fs = require('fs');

// Load the scaler object
const scaler = JSON.parse(fs.readFileSync('scaler.json', 'utf8'));
const loadedScaler = tf.keras.preprocessing.minmaxScaling();
loadedScaler.fromConfig(scaler);

// Normalize new_data
const new_data_normalized = loadedScaler.transform(new_data);
const new_data_normalized_reshaped = tf.tensor(new_data_normalized).reshape([1, new_data_normalized.length]);

const predictions = model.predict(new_data_normalized_reshaped);


const MODEL_URL = 'http://127.0.0.1:1234/model.json';

let model;
async function loadmodel() {

    model= await tf.loadLayersModel(MODEL_URL)
    console.log(model)

}

loadmodel().then(()=>{
    console.log("success load model")

})

Predict=(A)=>
{
    if (!model) return ;
    let md=tf.tensor3d(
        [A]
    )
    let s = model.predict(md).arraySync()
    return s[0]
}

TuioCanvas.Main = (function() {
    var client = null,
        screenW = null,
        screenH = null,
        time = null,
        canvas = null,
        context = null,
        objSize = 250,

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


            for (var i in cursors) {
                drawCursor(cursors[i]);
            }

            for (var i in objects) {

               // console.log(objects[i])
               // console.log(objects[i].xPos," ",objects[i].yPos," ",objects[i].symbolId)
                let dt=new Date().getTime()
                positions.push({'id':cnt,'x':objects[i].xPos,'y':objects[i].yPos,'time':dt,'angle':objects[i].angle})
                let len=20
               if (model && cnt>=40){
                    let A=[]
                    for (let j=cnt-len+1;j<=cnt;j++)
                    {

                        A[j-(cnt-len+1)]=[positions[j].x,positions[j].y]


                    }
                    console.log("A before",A)
                    A=Predict(A)
                    console.log("A After",A)
                    context.save();

                    context.translate(
                        A[0]* screenW,A[1]*screenH
                    );
                    context.rotate(objects[i].getAngle());

                    context.fillStyle = "#aaaaaa";
                    context.fillRect(-objSize * 0.5, -objSize * 0.5, objSize, objSize);

                    context.restore();
                }
                cnt++;

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
                object.getScreenX(screenW) ,
                object.getScreenY(screenH)
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


document.addEventListener("keydown",(event)=>{
    if (event.key==='s')
    {
        const json=JSON.stringify(positions)
        const blob=new Blob([json],{type:'application/json'})
        const url=URL.createObjectURL(blob)
        const a=document.createElement("a")
        a.download='positions.json'
        a.href=url
        a.click()
        URL.revokeObjectURL(url)
    }
})

$(function() {
    TuioCanvas.init();
});
