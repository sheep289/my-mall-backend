const express = require('express')
const router = express.Router()

router.get('/cart',(req,res) => {
    res.send('ok')
})

module.exports = router