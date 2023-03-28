import React, { useRef, useEffect } from 'react';
import {useWindowSize} from "./src/useWindowSize";

var Tuio = require("./src/Tuio");
    Tuio.Client = require("./src/TuioClient");

var Deque = require("collections/deque");
var Robj=new Array();

(function() {
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
        window.cancelRequestAnimationFrame = window[vendors[x]+
        'CancelRequestAnimationFrame'];
    }

    if (!window.requestAnimationFrame)
        window.requestAnimationFrame = function(callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function() { callback(currTime + timeToCall); },
                timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };

    if (!window.cancelAnimationFrame)
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
}())
const Canvas = () => {

    var client = null,
        screenW = null,
        screenH = null,
        time = null,
        objSize = 50;
    var cursors=null;
    var objects=null;
    var pointers=null;

    let initClient = ()=> {
        client = new Tuio.Client({
            host: "ws://localhost:8080"
        });
        //client.on("connect", onConnect);
        client.connect();
    }
    const canvasRef = useRef(null);
    const {width,height} = useWindowSize();

   // console.log(width+'   '+ height)
    var deque=new Deque();
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let mouseX = 0;
        let mouseY = 0;
        let lastMouseX = 0;
        let lastMouseY = 0;
        let mouseSpeed = 0;


        canvas.width = width;
        canvas.height = height;
        let initClient = ()=> {
            client = new Tuio.Client({
                host: "ws://localhost:8080"
            });
            client.on("connect", draw);
            client.connect();
        }
        const updateMousePosition = (event) => {
            lastMouseX = mouseX;
            lastMouseY = mouseY;
            mouseX = event.clientX - canvas.offsetLeft;
            mouseY = event.clientY - canvas.offsetTop;
            mouseSpeed = Math.sqrt(Math.pow(mouseX - lastMouseX, 2) + Math.pow(mouseY - lastMouseY, 2));
            let obj=new Object();
            obj.posX=mouseX;
            obj.posY=mouseY;
            obj.speed=mouseSpeed;
            if (deque.length>=50)
                deque.shift();
            deque.push(obj);
        };
        var drawCursor = function(cursor) {
            ctx.fillStyle = "#009fe3";
            ctx.beginPath();
            ctx.arc(
                cursor.getScreenX(width),
                cursor.getScreenY(height),
                objSize * 0.5,
                0,
                Math.PI * 2
            );
            ctx.closePath();
            ctx.fill();
        }
        var drawObject = function(object) {
            if (object.symbolId===0)
                return ;
            ctx.save();

            ctx.translate(
                object.getScreenX(width) + objSize * 0.5,
                object.getScreenY(height) + objSize * 0.5
            );
            ctx.rotate(object.getAngle());

            ctx.fillStyle = "#ffffff";
            ctx.fillRect(-objSize * 0.5, -objSize * 0.5, objSize, objSize);

            ctx.restore();
        };
        const draw = () => {

         //   console.log(cursors)
        //    if (objects)
                //console.log(objects)
/*
            let obj=deque.peekBack();
            if (obj) {
                ctx.fillStyle = "#210029"
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = "#009fe3";
            //    ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.fillText(`Mouse position: (${obj.posX}, ${obj.posY})`, 10, 20);
                ctx.fillText(`Mouse speed: ${obj.speed.toFixed(2)}`, 10, 40);

            }*/
            cursors = client.getTuioCursors(),
                pointers = client.getTuioPointers(),
                objects = client.getTuioObjects();
            ctx.fillStyle = "#210029"
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            for (var i in cursors) {
                drawCursor(cursors[i]);
            }
            let cnt=0;
            for (var i in objects) {
               // drawObject(objects[i])
                console.log(i)
                let find=false;
                let id=-1;
                for (var j in Robj)
                {
                    if (Robj[j].id===i)
                    {
                        find=true;
                        id=j;
                        break;
                    }
                }
                if (find===false)
                {
                    let ee=new Object();
                    ee.id=i;
                    ee.que=new Deque();
                    ee.que.push(objects[i]);
                    ee.cnt=0;
                    Robj.push(ee)
                } else {
                    Robj[j].que.push(objects[i])
                    Robj[j].cnt=0;
                    if (Robj[j].que.length>=60)
                            Robj[j].que.shift();
                }
                cnt++;
            }
            for (var i in Robj)
            {
                let find=false;
                for (var j in objects)
                {
                    if (Robj[i].id===j)
                        find=true;
                }
                if (!find)
                    Robj[i].cnt++;
                if (Robj[i].cnt>=20)
                    Robj.splice(i);
            }
            for (var i in Robj)
            {
                let obj=Robj[i].que.peekBack();
                drawObject(obj);
            }
            if (cnt===0) console.log("err")
            ctx.fillStyle="#FFFFFF"
            ctx.fillText(`Cursor Numbers: (${JSON.stringify(objects)})`, 10, 20);
            setTimeout(()=>{
                requestAnimationFrame(draw);
            },1000/60)

        };

  //      canvas.addEventListener('mousemove', updateMousePosition);
       // draw();
        initClient();
        return () => {
            canvas.removeEventListener('mousemove', updateMousePosition);
        };
    }, []);
    const debug= event =>{
        console.log(deque.length)
        console.log(deque)

    }
    return <canvas tabIndex={0} ref={canvasRef} onKeyDown={debug}/>;
};

export default Canvas;
