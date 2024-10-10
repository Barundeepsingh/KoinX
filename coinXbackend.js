const express = require('express')
const axios = require('axios');
const mongoose = require('mongoose');
const Coin = require('./models/coinModel')
require('dotenv').config();

const app = express();
const port = process.env.PORT;
app.use(express.json());

const mongoURL = process.env.mongoUrl;

mongoose.connect(mongoURL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('Database connected'))
.catch(err => console.error('MongoDB connection error:', err));

const coinPrice = (ids) => {
    const apiKey = process.env.apiKey;
    const apiURL = `${process.env.apiUrl}?ids=${ids}&vs_currencies=usd&include_market_cap=true&include_24hr_change=true&x-cg-demo-api-key=${apiKey}`;
    return axios.get(apiURL)
    .then(response => {
        return response.data
    })
    .catch(error => {
        console.error(error);
        throw error;
    });
};


//api to fetch stats for a particular coin
app.post('/stats', (req, res) => {
//    console.log(req.body.ids);
    const ids = req.body.ids;

    if (!ids) {
        return res.status(400).json({ error: 'Invalid or missing "ids" field.' });
    }

    coinPrice(ids)
    .then(data =>{
//        console.log("data from Api", data);
        const coin = Object.keys(data)[0];
        const coinData = data[coin]

        const transformedData = {
            price: coinData.usd,
            marketCap: coinData.usd_market_cap,
            "24hChange": coinData.usd_24h_change.toFixed(2)
        };

        const dataToSave ={
            coin: ids,
            price: transformedData.price
        }

//        console.log(transformedData);
        res.json(transformedData);
        new Coin(dataToSave).save();
    })
    .catch(error => {
        res.status(500).json({ error: 'An error occurred while fetching data from the CoinGecko API.' });
    });
})


//api to fetch standard deviation for a particular coin
app.post('/deviation', async (req, res) => {
    const coin = req.body.coin;
    console.log(req.body.coin);
    // Check if the coin parameter is provided
    if (!coin) {
        return res.status(400).json({ error: 'Missing "coin" name in request body.' });
    }

    try {
        // Log the requested coin for debugging
        console.log("Searching for coin:", coin);

        // Perform a case-insensitive query for the specified coin
        const records = await Coin.find({ coin: { $regex: new RegExp(coin, 'i') } })
            .sort({ createdAt: -1 })
            .limit(100);

        // Check if records were found
        if (records.length === 0) {
            return res.status(404).json({ error: 'No records found for the specified cryptocurrency.' });
        }

        // Extract prices from the found records
        const prices = records.map(record => record.price);
        const mean = prices.reduce((acc, price) => acc + price, 0) / prices.length;

        // Use this line for population standard deviation
        const variance = prices.reduce((acc, price) => acc + Math.pow(price - mean, 2), 0) / prices.length;

        // Calculate standard deviation
        const stdDeviation = Math.sqrt(variance);

        // Respond with the calculated standard deviation
        res.json({ standardDeviation: stdDeviation.toFixed(2) });

    } catch (error) {
        console.error("Error occurred:", error);
        res.status(500).json({ error: 'An error occurred while calculating standard deviation.' });
    }
});


app.listen(port, () => {
    console.log(`Server running`);
})