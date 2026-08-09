const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Public routes (no auth)
router.post('/register', userController.register);
router.post('/login', userController.login);

// Protected routes (with :id param) - KEEP THESE LAST
router.get('/:id', userController.getUser);
router.put('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);

module.exports = router;
