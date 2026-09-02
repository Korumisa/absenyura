import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { publicSiteCache } from '../middlewares/publicSiteCache.middleware.js';
import {
  getPublicProfile,
  getPublicPrograms,
  listPublicPosts,
  getPublicPostBySlug,
  listPublicCategories,
  getPublicGalleries,
  getPublicRecruitments,
  getPublicStructure,
  upsertAdminProfile,
  getAdminStructure,
  replaceAdminStructure,
  setActiveCabinet,
  listAdminPrograms,
  createAdminProgram,
  updateAdminProgram,
  deleteAdminProgram,
  listAdminCategories,
  createAdminCategory,
  updateAdminCategory,
  deleteAdminCategory,
  listAdminPosts,
  createAdminPost,
  updateAdminPost,
  deleteAdminPost,
  listAdminGalleries,
  createAdminGallery,
  updateAdminGallery,
  deleteAdminGallery,
  listAdminRecruitments,
  createAdminRecruitment,
  updateAdminRecruitment,
  deleteAdminRecruitment,
  uploadPublicAsset,
} from '../controllers/public-site.v2.controller.js';

const router = Router();

const publicRead = [publicSiteCache];

router.get('/profile', ...publicRead, getPublicProfile);
router.get('/programs', ...publicRead, getPublicPrograms);
router.get('/categories', ...publicRead, listPublicCategories);
router.get('/posts', ...publicRead, listPublicPosts);
router.get('/posts/:slug', ...publicRead, getPublicPostBySlug);
router.get('/galleries', ...publicRead, getPublicGalleries);
router.get('/recruitments', ...publicRead, getPublicRecruitments);
router.get('/structure', ...publicRead, getPublicStructure);

router.use(authenticate);
router.use(authorize(['SUPER_ADMIN', 'CONTENT_ADMIN']));

router.get('/admin/profile', getPublicProfile);
router.put('/admin/profile', upsertAdminProfile);
router.get('/admin/structure', getAdminStructure);
router.put('/admin/structure', replaceAdminStructure);
router.put('/admin/structure/active/:id', setActiveCabinet);

router.get('/admin/programs', listAdminPrograms);
router.post('/admin/programs', createAdminProgram);
router.put('/admin/programs/:id', updateAdminProgram);
router.delete('/admin/programs/:id', deleteAdminProgram);

router.get('/admin/categories', listAdminCategories);
router.post('/admin/categories', createAdminCategory);
router.put('/admin/categories/:id', updateAdminCategory);
router.delete('/admin/categories/:id', deleteAdminCategory);

router.get('/admin/posts', listAdminPosts);
router.post('/admin/posts', createAdminPost);
router.put('/admin/posts/:id', updateAdminPost);
router.delete('/admin/posts/:id', deleteAdminPost);

router.post('/admin/upload', uploadPublicAsset);

router.get('/admin/galleries', listAdminGalleries);
router.post('/admin/galleries', createAdminGallery);
router.put('/admin/galleries/:id', updateAdminGallery);
router.delete('/admin/galleries/:id', deleteAdminGallery);

router.get('/admin/recruitments', listAdminRecruitments);
router.post('/admin/recruitments', createAdminRecruitment);
router.put('/admin/recruitments/:id', updateAdminRecruitment);
router.delete('/admin/recruitments/:id', deleteAdminRecruitment);

export default router;
