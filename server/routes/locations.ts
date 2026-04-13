import { Router } from 'express';
import { getLocations, createLocation, updateLocation, deleteLocation } from '../controllers/location.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);
router.use(authorize(['SUPER_ADMIN', 'ADMIN']));

router.get('/', getLocations);
router.post('/', createLocation);
router.put('/:id', updateLocation);
router.delete('/:id', deleteLocation);

export default router;