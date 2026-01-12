import express from 'express';
import { getHealth, liveness } from '../controllers/health.controller.js';

const router = express.Router();

router.get('/status', getHealth);
router.get('/liveness', liveness);

export default router;
