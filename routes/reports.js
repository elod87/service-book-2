const router = require('express').Router();
const auth = require('../middleware/auth');
const { Service } = require('../models/service');

//get earnings from last 6 months 
router.get('/earningsPerMonth', auth, async (req, res) => {
    var monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    
    const today = new Date();
    let monthLabels = [];
    let promises = [];
    for(let i = 5; i >= 0; i--) {
        const firstDay = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const firstDayNextMonth = new Date(today.getFullYear(), today.getMonth() - i + 1, 1);

        //build the array with the name of the months
        monthLabels.push(monthNames[firstDay.getMonth()]);        

        //get promise with totals for current month
        promises.push(Service.aggregate([
            {
                $match: { 'date': {
                    $gte: firstDay,
                    $lt: firstDayNextMonth
                }}
            },
            {
                $project: {
                    _id: null,
                    totalActions: {
                        $sum: {
                            $map: {
                                input: '$actions',
                                as: 'action',
                                in: { $multiply: [
                                    { $ifNull: [ '$$action.quantity', 0] },
                                    { $ifNull: [ '$$action.price', 0] }
                                ]}
                            }                        
                        }
                    },
                    totalNewDevices: {
                        $sum: {                       
                            $map: {
                                input: '$newDevices',
                                as: 'newDevice',
                                in: { $multiply: [
                                    { $ifNull: [ '$$newDevice.quantity', 0] },
                                    { $ifNull: [ '$$newDevice.price', 0] }
                                ]}
                            }
                        }
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    totalIncome: { $sum: { $add: ['$totalActions', '$totalNewDevices' ] } }
                }
            }
        ]));
    }

    Promise.all(promises)
        .then((results) => {
            let totals = [];
            for(const result of results) {
                if (result.length > 0) {
                    totals.push(result[0].totalIncome);
                } else {
                    totals.push(0);
                }
            }
            
            const data = {
                labels: monthLabels,
                data: totals
            }

            res.send(data);
        });
});

//get service count by state
router.post('/serviceCount', auth, async (req, res) => {
    const count = await Service.count({ status: req.body.status });
    res.send(String(count));
});


module.exports = router;