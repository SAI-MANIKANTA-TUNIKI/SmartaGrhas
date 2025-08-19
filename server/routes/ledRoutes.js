import express from 'express';
import { updateLedSettings, getLedSettings } from '../controllers/ledController.mjs';

const router = express.Router();

router.get('/:microcontrollerNumber', getLedSettings);
router.post('/:microcontrollerNumber', updateLedSettings);

export default router;