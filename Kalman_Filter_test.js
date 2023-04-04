const {KalmanFilter} = require('kalman-filter');


const kFilter = new KalmanFilter({
	observation: {
		sensorDimension: 2,
		name: 'sensor'
	},
	dynamic: {
		name: 'constant-acceleration',// observation.sensorDimension * 3 == state.dimension
		timeStep: 0.1,
		covariance: [1, 1, 4, 5, 1, 4]// equivalent to diag([3, 3, 4, 4, 5, 5])
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
obe=[0,7];
pre(obe);
obe=[0,10];
pre(obe);
obe=[0.2,7.5]
pre(obe)
obe=[0.1,8]
pre(obe)
obe=[0,9]
pre(obe)