import { Router } from 'express';
import {
  getLocations,
  createLocation,
  updateLocation,
  deleteLocation,
} from '../controllers/location.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { validateBody, validateParams } from '../middlewares/validate.js';
import { CreateLocationBody, UpdateLocationBody, LocationParams } from '../zod-schemas/index.js';

const router = Router();

router.use(authenticate);
router.use(authorize(['SUPER_ADMIN', 'ADMIN']));

router.get('/', getLocations);
router.post('/', validateBody(CreateLocationBody), createLocation);
router.put(
  '/:id',
  validateParams(LocationParams),
  validateBody(UpdateLocationBody),
  updateLocation
);
router.delete('/:id', validateParams(LocationParams), deleteLocation);

export default router;
