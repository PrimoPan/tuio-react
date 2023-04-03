const {KalmanFilter} = require('kalman-filter');

const kFilter = new KalmanFilter({
	observation: {
		sensorDimension: 2,
		name: 'sensor'
	},
	dynamic: {
		name: 'constant-position',// observation.sensorDimension == dynamic.dimension
		covariance: [3, 4]// equivalent to diag([3, 4])
	}
});
let previousCorrected = null;
const results = [];
let obe;
let pre=(observation) => {
	const predicted = kFilter.predict({
		previousCorrected
	});

	 const correctedState = kFilter.correct({
		predicted,
		observation
	});
	console.log("corrent:" ,correctedState.mean)
	console.log("predict: ",predicted.mean);
	// update the previousCorrected for next loop iteration
	previousCorrected = correctedState
}
obe=[0,0];
pre(obe);
obe=[0,1];
pre(obe);
obe=[0,2];
pre(obe)
obe=[0,3];
pre(obe);
obe=[0,4];
pre(obe);
obe=[0,5];
pre(obe);
obe=[0,6];
pre(obe);
