const express = require("express");
const router = express.Router();
const walletController = require("../controllers/walletController");

// GET wallet balance
router.get("/balance/:username", walletController.getWalletBalance);

// POST place a bet
router.post("/bet", walletController.placeBet);

// POST cashout
router.post("/cashout", walletController.cashOut);

module.exports = router;
