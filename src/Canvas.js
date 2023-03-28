import React, { useRef, useEffect } from 'react';
import {useWindowSize} from "./src/useWindowSize";

var Tuio = require("./src/Tuio");
    Tuio.Client = require("./src/TuioClient");
var Deque = require("collections/deque");

const Canvas = () => {

    var client = null,
        screenW = null,
        screenH = null,
        time = null,
        objSize = 50;


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
                cursor.getScreenX(screenW),
                cursor.getScreenY(screenH),
                objSize * 0.5,
                0,
                Math.PI * 2
            );
            ctx.closePath();
            ctx.fill();
        }
        const draw = () => {
            let obj=deque.peekBack();
            if (obj) {
                ctx.fillStyle = "#210029"
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = "#009fe3";
            //    ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.fillText(`Mouse position: (${obj.posX}, ${obj.posY})`, 10, 20);
                ctx.fillText(`Mouse speed: ${obj.speed.toFixed(2)}`, 10, 40);

            }
            requestAnimationFrame(draw);
        };

        canvas.addEventListener('mousemove', updateMousePosition);
        draw();

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
