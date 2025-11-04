const express = require('express');
const router = express.Router();

const Review = require('../models/ReviewModel')

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

module.exports = router;