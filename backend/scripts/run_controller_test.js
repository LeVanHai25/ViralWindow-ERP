
const projectController = require('../controllers/projectController');

const req = {
    params: { id: 6 }, // Project ID 6
    user: { id: 1 }
};

const res = {
    json: (data) => {
        console.log('Response received:');
        console.log('Timeline:', data.timeline);
        console.log('Logs count:', data.count);
        // console.log('Logs:', data.data.map(l => `${l.event_type} at ${l.timestamp}`));
    },
    status: (code) => {
        console.log(`Status: ${code}`);
        return res;
    }
};

console.log('Running getProjectLogsFull...');
projectController.getProjectLogsFull(req, res);
