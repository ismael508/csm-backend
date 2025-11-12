const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');

const Review = require('../models/ReviewModel')
const User = require('../models/UserModel')

router.patch('/reviews/update', async (req, res) => {
    try {
        const { reviewId, updates } = req.body;

        const updatedReview = await Review.findOneAndUpdate(
            { _id: reviewId },
            { $set: updates },
            { new: true, runValidators: true }
        )

        if (!updatedReview){
            return res.status(404).json({ "message": "Review couldn't be found." })
        }
        
        res.status(200).json(updatedReview);
    } catch (err) {
        console.error(err)
        res.status(500).json({ message: "Internal server error." })
    }
})

router.post('/users/modify', async (req, res) => {
    const { email, updates, passKey } = req.body;
    if (passKey === process.env.SECRET_KEY){
        for (let key in updates){
            if (key === 'password'){
                updates[key] = await bcrypt.hash(updates[key], 10);
            }
        }
        try {
            const updatedUser = await User.findOneAndUpdate(
                { email: email },
                { $set: updates },
                { new: true, runValidators: true }
            )
            if (!updatedUser){
                return res.status(404).json({ "message": "User couldn't be found." })
            }
            res.status(200).json(updatedUser);
        } catch (err) {
            console.error(err)
            res.status(500).json({ message: "Internal server error." })
        }
    } else {
        res.status(401).json({ message: "Unauthorised!" })
    }
})

module.exports = router;