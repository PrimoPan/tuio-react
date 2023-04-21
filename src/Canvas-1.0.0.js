import React, { useRef, useEffect } from 'react';
import {useWindowSize} from "./src/useWindowSize";

var Tuio = require("./src/Tuio");
Tuio.Client = require("./src/TuioClient");

var Deque = require("collections/deque");


var Robj=[];
var Rcursor=[];
/*
    Robj stores the tokens's information
 */
let del=[];

document.documentElement.addEventListener('touchstart', function (event) {
    if (event.touches.length > 1) {
        event.preventDefault();
    }
}, {passive:false});

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
let precur=[];
const Canvas = () => {

    let client = null,
        //A Tuio Client
        objSize = 250;
    //Token's Size
    const canvasRef = useRef(null);
    const {width,height} = useWindowSize();
    useEffect(() => {
        let cursors=null;
        let objects=null;
        let pointers=null;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        canvas.width = width;
        canvas.height = height;
        let initClient = ()=> {
            client = new Tuio.Client({
                host: "ws://localhost:8080"
            });
            client.on("connect", collectData);
            client.connect();
        }
        var drawCursor = function(cursor) {
            ctx.fillStyle = "#009fe3";
            ctx.beginPath();
            ctx.arc(
                cursor.getScreenX(width),
                cursor.getScreenY(height),
                50 * 0.5,
                0,
                Math.PI * 2
            );
            ctx.closePath();
            ctx.fill();
        }
        let drawObject = (object) => {
            if (object.symbolId===0)
                return ;
            ctx.save();

            ctx.translate(
                object.getScreenX(width),
                object.getScreenY(height)
            );
            ctx.rotate(object.getAngle());
            switch (object.symbolId)
            {
                case 1:
                    ctx.fillStyle = "#ffffff";
                    break;
                case 2:
                    ctx.fillStyle = "#CCFF33"
                    break;
                case 3:
                    ctx.fillStyle = "#FF0099"
                    break;
                case 4:
                    ctx.fillStyle = "#0099CC"
                    break;
                case 5:
                    ctx.fillStyle = "#FF9900"
                    break;
                case 6:
                    ctx.fillStyle = "#CC6666"
                    break;
                default:
                    ctx.fillStyle = "#000000"

            }
            ctx.fillRect(-objSize*0.5, -objSize*0.5 , objSize, objSize);
            ctx.font="30px";
            ctx.fillStyle= "#CCCCFF"
            ctx.fillText(object.symbolId,objSize,objSize);
            ctx.fillText(`pos: (${object.getScreenX(width)},${object.getScreenY(height)})`,objSize,objSize*1.1)
            ctx.fillText(`deltapos=(${object.deltaX},${object.deltaY})  speed=${object.Speed} px/ms`,objSize,objSize*1.2)
            ctx.restore();
        };

        const draw = () =>{
         //   console.log(cursors)
            ctx.fillStyle = "#210029"
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            clearObjects();
            clearCursors();
            for (let i in Robj)
            {
                let obj=Robj[i].que.peekBack();
                drawObject(obj);
            }
            for (let i in Rcursor)
            {
                let obj=Rcursor[i].que.peekBack();
                drawCursor(obj)
            }
        }
        const clearCursors = () =>{
            for (let i in del){
                for (let j in cursors)
                    if (cursors[j]!=null)
                    if (cursors[j].sessionId===del[i])
                        cursors[j]=null;
                for (let j in Rcursor)
                        if (Rcursor[j].sessionId)
                             if (Rcursor[j].sessionId===del[i])
                        Rcursor.splice(Rcursor[j])
            }
            for (let i in cursors)
            {
                if (cursors[i]===null)
                    continue;
                let find=false;
                let id=-1;
                for (let j in Rcursor)
                {
                    if (cursors[i].sessionId===Rcursor[j].sessionId)
                    {
                        find=true;
                        id=j;
                        break;
                    }
                }
                if (find===false)
                {
                    let ee={};
                    ee.que=new Deque();
                    let OBJ={};
                    OBJ.xPos=cursors[i].getScreenX(width)
                    OBJ.yPos=cursors[i].getScreenY(height)
                    OBJ.Time=OBJ.currentTime.seconds*100000+OBJ.currentTime.microSeconds;
                    ee.que.push(OBJ);
                    ee.cnt=0;
                    ee.sessionId=cursors[i].sessionId;
                    Rcursor.push(ee);
                }
                else {
                    let OBJ={};
                    OBJ.xPos=cursors[i].getScreenX(width)
                    OBJ.yPos=cursors[i].getScreenY(height)
                    OBJ.Time=OBJ.currentTime.seconds*100000+OBJ.currentTime.microSeconds;
                   // if (delta===0) break;
                    Rcursor[id].que.push(OBJ)
                    Rcursor[id].cnt=0;
                    if (Rcursor[id].que.length>60)
                        Rcursor[id].que.shift();
                }

                for (let i in Rcursor)
                {
                    let find=false;
                    for (let j in cursors)
                    {
                        if (Rcursor[i].sessionId===cursors[j].sessionId)
                            find=true;
                    }
                    if (!find)
                        Rcursor[i].cnt++;
                    if (Rcursor[i].cnt>20) {
                        console.log(Rcursor[i].cnt)
                        Rcursor.splice(Rcursor[i]);
                        continue;
                    }
                    if (Rcursor[i].que.length>=58)
                    {
                        let st=Rcursor[i].que.peek();
                        let ed=Rcursor[i].que.peekBack();
                        if (st.xPos===ed.yPos && st.xPos===ed.yPos )
                            del.push(Rcursor[i].sessionId);
                    }
                }
            }
        }
        const clearObjects = () => {
            for (let i in objects) {
                let find=false;
                let id=-1;
                for (let j in Robj)
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
                    let ee={};
                    ee.id=i;
                    ee.que=new Deque();
                    let OBJ=objects[i];
                    OBJ.Time=OBJ.currentTime.seconds*100000+OBJ.currentTime.microSeconds;
                    OBJ.deltaX=0;
                    OBJ.deltaY=0;
                    OBJ.delta=0;
                    OBJ.deltaTime=0;
                    OBJ.Speed=0;
                    OBJ.XSpeed=0;
                    OBJ.YSpeed=0;
                    OBJ.deltaAngle=0;
                    OBJ.AngleSpeed=0;
                    ee.que.push(OBJ);
                    ee.cnt=0;
                    Robj.push(ee)
                } else {
                    let OBJ=objects[i];
                    let LastObj=Robj[id].que.peekBack();

                    let xPos=OBJ.getScreenX(width),
                        yPos=OBJ.getScreenY(height),
                        lxPos=LastObj.getScreenX(width),
                        lyPos=LastObj.getScreenY(height);
                    OBJ.Time=OBJ.currentTime.seconds*100000+OBJ.currentTime.microSeconds;
                    let delta=OBJ.Time-LastObj.Time;
                    if (delta===0) break;
                    OBJ.deltaX=xPos-lxPos;
                    OBJ.deltaY=yPos-lyPos;
                    OBJ.deltaAngle=OBJ.angle-LastObj.angle;
                    OBJ.deltaTime=delta;
                    OBJ.XSpeed=OBJ.deltaX/delta;
                    OBJ.YSpeed=OBJ.deltaY/delta;
                    OBJ.Speed= Math.sqrt(OBJ.deltaX*OBJ.deltaX+OBJ.deltaY*OBJ.deltaY)/delta;
                    OBJ.AngleSpeed = OBJ.deltaAngle/delta;
                    Robj[id].que.push(OBJ)
                    Robj[id].cnt=0;
                    if (Robj[id].que.length>=60)
                        Robj[id].que.shift();
                }
            }
            for (let i in Robj)
            {
                let find=false;
                for (let j in objects)
                {
                    if (Robj[i].id===j)
                        find=true;
                }
                if (!find)
                    Robj[i].cnt++;
                if (Robj[i].cnt>=20)
                    Robj.splice(Robj[i]);
            }
        }
        const collectData = () => {
            cursors = client.getTuioCursors();
            pointers = client.getTuioPointers();
            objects = client.getTuioObjects();

            clearObjects();
            clearCursors();
            draw();
            setTimeout(()=>{
                requestAnimationFrame(collectData);
            },1000/60)

        };
        initClient();
        return () => {
        };
    }, []);
    const debug= event =>{
    }
    return <canvas tabIndex={0} ref={canvasRef} onKeyDown={debug}/>;
};

export default Canvas;
/*
    quit drinking for 2days
 */