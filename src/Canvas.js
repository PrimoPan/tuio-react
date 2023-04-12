import React, { useRef, useEffect } from 'react';
import {useWindowSize} from "./src/useWindowSize";
import {Filter_2D} from "./oneeurofilter/2D-Filter"
const {KalmanFilter} = require('kalman-filter');

class LowPassFilter {

    setAlpha(alpha) {
        if (alpha<=0.0 || alpha>1.0)
            console.log("alpha should be in (0.0., 1.0]");
        this.a = alpha;
    }

    constructor(alpha, initval=0.0) {
        this.y = this.s = initval;
        this.setAlpha(alpha);
        this.initialized = false;
    }

    filter(value) {
        var result;
        if (this.initialized)
            result = this.a*value + (1.0-this.a) * this.s;
        else {
            result = value;
            this.initialized = true;
        }
        this.y = value;
        this.s = result;
        return result;
    }

    filterWithAlpha(value, alpha) {
        this.setAlpha(alpha);
        return this.filter(value);
    }

    hasLastRawValue() {
        return this.initialized;
    }

    lastRawValue() {
        return this.y;
    }

    reset() {
        this.initialized = false;
    }

}

// -----------------------------------------------------------------

class OneEuroFilter {

    alpha(cutoff) {
        var te = 1.0 / this.freq;
        var tau = 1.0 / (2 * Math.PI * cutoff);
        return 1.0 / (1.0 + tau/te);
    }

    setFrequency(f) {
        if (f<=0) console.log("freq should be >0") ;
        this.freq = f;
    }

    setMinCutoff(mc) {
        if (mc<=0) console.log("mincutoff should be >0");
        this.mincutoff = mc;
    }

    setBeta(b) {
        this.beta_ = b;
    }

    setDerivateCutoff(dc) {
        if (dc<=0) console.log("dcutoff should be >0") ;
        this.dcutoff = dc ;
    }

    constructor(freq, mincutoff=1.0, beta_=0.0, dcutoff=1.0) {
        this.setFrequency(freq) ;
        this.setMinCutoff(mincutoff) ;
        this.setBeta(beta_) ;
        this.setDerivateCutoff(dcutoff) ;
        this.x = new LowPassFilter(this.alpha(mincutoff)) ;
        this.dx = new LowPassFilter(this.alpha(dcutoff)) ;
        this.lasttime = undefined ;
    }

    reset() {
        this.x.reset();
        this.dx.reset();
        this.lasttime = undefined;
    }

    filter(value, timestamp=undefined) {
        // update the sampling frequency based on timestamps
        if (this.lasttime!=undefined && timestamp!=undefined)
            this.freq = 1.0 / (timestamp-this.lasttime) ;
        this.lasttime = timestamp ;
        // estimate the current variation per second
        var dvalue = this.x.hasLastRawValue() ? (value - this.x.lastRawValue())*this.freq : 0.0 ;
        var edvalue = this.dx.filterWithAlpha(dvalue, this.alpha(this.dcutoff)) ;
        // use it to update the cutoff frequency
        var cutoff = this.mincutoff + this.beta_ * Math.abs(edvalue) ;
        // filter the given value
        return this.x.filterWithAlpha(value, this.alpha(cutoff)) ;
    }
}

let freq=120;
let fx=new OneEuroFilter(120,1,1,1);
let fy=new OneEuroFilter(120,1,1,1)
let Filter2D;
let KF=[];
for (let i=0;i<150;i++)
    KF[i]=new KalmanFilter({
        observation: {
            sensorDimension: 2,
            name: 'sensor'
        },
        dynamic: {
            name: 'constant-acceleration',// observation.sensorDimension * 3 == state.dimension
            timeStep: 0.2,
            covariance:[3, 3, 4, 4, 5, 5]// equivalent to diag([3, 3, 4, 4, 5, 5])
        }
    });
let CNT=0;
let previousCorrected = null;
const results = [];
let obe;
let pre=(kFilter,observation) => {
    const predicted = kFilter.predict({
        previousCorrected
    });

    const correctedState = kFilter.correct({
        predicted,
        observation
    });
    // console.log("corrent:" ,correctedState.mean)
    //console.log("predict: ",predicted.mean);
    // update the previousCorrected for next loop iteration
    let pd=[predicted.mean[0],predicted.mean[1]]
    // console.log(pd);
    if (CNT%5===0)
        previousCorrected = correctedState
    return pd;
}
let pre2=(kFilter,observation) => {
    const predicted = kFilter.predict({
        previousCorrected
    });

    const correctedState = kFilter.correct({
        predicted,
        observation
    });
    // console.log("corrent:" ,correctedState.mean)
    //console.log("predict: ",predicted.mean);
    // update the previousCorrected for next loop iteration
    let pd=[predicted.mean[0],predicted.mean[1]]
    // console.log(pd);
    previousCorrected = correctedState
    return pd;
}

var Tuio = require("./src/Tuio");
Tuio.Client = require("./src/TuioClient");

var Deque = require("collections/deque");
var Robj=[];
/*
    Robj stores the tokens's information
 */


document.documentElement.addEventListener('touchstart', function (event) {
    if (event.touches.length > 1) {
        event.preventDefault();
    }
}, {passive:false});

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
            client.on("connect", collectData);
            client.connect();
        }
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
        let drawObject = (object) => {
            if (object.symbolId===0)
                return ;
            //console.log(object)
          /*  let pred=[object.getScreenX(width), object.getScreenY(height)];

            let now=[]
            CNT++;
            now=pre(KF[0],pred)
            pred=now;
            let kF=KF[0];
            if (kF) {
                for (let i = 0; i < 4; i++) {
                    now = pre2(kF, pred);
                    pred = now;
                }
            }
            KF[0]=kF;*/


         /*   ctx.save();

            ctx.translate( now[0],now[1]);

            ctx.rotate(object.getAngle())
            ctx.fillStyle="#114514"
            ctx.fillRect(-objSize*0.5, -objSize*0.5 , objSize, objSize);
            ctx.restore();

*/
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
            ctx.fillStyle = "#210029"
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            clearObjects();
            for (let i in Robj)
            {
                let obj=Robj[i].que.peekBack();
                drawObject(obj);
            }
            ctx.fillStyle="#FFFFFF" //background-color
            //  ctx.fillText(`Cursor Numbers: (${JSON.stringify(objects)})`, 10, 20);

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
                    let tme=OBJ.currentTime.seconds*100000+OBJ.currentTime.microSeconds;
                    OBJ.Time=tme;
                    OBJ.deltaX=0;
                    OBJ.deltaY=0;
                    OBJ.delta=0;
                    OBJ.deltaTime=0;
                    OBJ.Speed=0;
                    OBJ.XSpeed=0;
                    OBJ.YSpeed=0;
                    OBJ.deltaAngle=0;
                    OBJ.AngleSpeed=0;
                    OBJ.PD=[0,0]
                    OBJ.xPos=fx.filter(OBJ.xPos,OBJ.Time);
                    OBJ.yPos=fy.filter(OBJ.yPos,OBJ.Time);
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
                    // console.log("OBJ.time: ",OBJ.Time,"   ","Lastobj.time",LastObj.Time);
                    OBJ.deltaX=xPos-lxPos;
                    OBJ.deltaY=yPos-lyPos;
                    OBJ.deltaAngle=OBJ.angle-LastObj.angle;
                    OBJ.deltaTime=delta;
                    OBJ.XSpeed=OBJ.deltaX/delta;
                    OBJ.YSpeed=OBJ.deltaY/delta;
                    OBJ.Speed= Math.sqrt(OBJ.deltaX*OBJ.deltaX+OBJ.deltaY*OBJ.deltaY)/delta;
                    OBJ.AngleSpeed = OBJ.deltaAngle/delta;
                    OBJ.Filter=LastObj.Filter;
                    let pos=pre(KF[0],[OBJ.xPos,OBJ.yPos]);
                    OBJ.xPos=pos[0];
                    OBJ.yPos=pos[1];/*
                    pos=Filter2D.predict(OBJ.xPos,OBJ.yPos,OBJ.Time);
                    OBJ.xPos=pos[0];
                    OBJ.yPos=pos[1];
*/
                    OBJ.xPos=fx.filter(OBJ.xPos,OBJ.Time);
                    OBJ.yPos=fy.filter(OBJ.yPos,OBJ.Time);
                    // OBJ.PD=OBJ.Filter.predict(xPos,yPos,OBJ.Time+300000);
                    //      else OBJ.PD=LastObj.PD;
                    Robj[id].que.push(OBJ)
                    Robj[id].cnt=0;
                    if (Robj[id].que.length>=60)
                        Robj[id].que.shift();
                    let T=Robj[id].que.toArray();
                    console.log(T)

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

            for (let i in Robj)
            {
                let obj=Robj[i].que.peekBack();
                drawObject(obj);
            }
        }
        const collectData = () => {

            cursors = client.getTuioCursors();
            pointers = client.getTuioPointers();
            objects = client.getTuioObjects();
            /* for (var i in cursors) {
                 drawCursor(cursors[i]);
             }*/
            setTimeout(()=>{clearObjects();},1000/30)
            draw();
            setTimeout(()=>{
                collectData()
            },1000/30)

        };

        //      canvas.addEventListener('mousemove', updateMousePosition);
        // draw();
        initClient();

        return () => {
        };
    }, []);
    const debug= event =>{

    }
    return <canvas tabIndex={0} ref={canvasRef} onKeyDown={debug}/>;
};

export default Canvas;