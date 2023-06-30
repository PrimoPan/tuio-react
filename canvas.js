var Tuio = require("../../src/Tuio");
    Tuio.Client = require("../../src/TuioClient");
    var TuioCanvas = {
    init: function() {
        this.Main.init();
    }
}
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

    constructor(freq, mincutoff=0.001, beta_=0.01, dcutoff=1.0) {
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


/*
const tf = require('@tensorflow/tfjs');
const MODEL_URL = 'http://127.0.0.1:8080/model.json';
let model;
async function loadmodel() {
    model= await tf.loadLayersModel(MODEL_URL)
    console.log(model)
    model.summary()
    let md=tf.tensor3d([[
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
        [0.2,0.1],
        [0.2,0.1]
        ]]

    )
    md.print()
    let pd=model.predict(md)
    console.log('第二步执行完毕')
    pd.print()
}

loadmodel()

 */
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
