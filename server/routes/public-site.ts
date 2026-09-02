import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { publicSiteCache } from '../middlewares/publicSiteCache.middleware.js';
import { validateBody, validateParams } from '../middlewares/validate.js';
import {
  UpsertPublicProfileBody,
  ReplaceAdminStructureBody,
  CreateProgramBody,
  UpdateProgramBody,
  CreateCategoryBody,
  UpdateCategoryBody,
  CreatePostBody,
  UpdatePostBody,
  CreateGalleryBody,
  UpdateGalleryBody,
  CreateRecruitmentBody,
  UpdateRecruitmentBody,
  StructureCabinetParams,
  ProgramParams,
  CategoryParams,
  PostParams,
  GalleryParams,
  RecruitmentParams,
} from '../zod-schemas/index.js';
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
router.put('/admin/profile', validateBody(UpsertPublicProfileBody), upsertAdminProfile);
router.get('/admin/structure', getAdminStructure);
router.put('/admin/structure', validateBody(ReplaceAdminStructureBody), replaceAdminStructure);
router.put('/admin/structure/active/:id', validateParams(StructureCabinetParams), setActiveCabinet);

router.get('/admin/programs', listAdminPrograms);
router.post('/admin/programs', validateBody(CreateProgramBody), createAdminProgram);
router.put(
  '/admin/programs/:id',
  validateParams(ProgramParams),
  validateBody(UpdateProgramBody),
  updateAdminProgram
);
router.delete('/admin/programs/:id', validateParams(ProgramParams), deleteAdminProgram);

router.get('/admin/categories', listAdminCategories);
router.post('/admin/categories', validateBody(CreateCategoryBody), createAdminCategory);
router.put(
  '/admin/categories/:id',
  validateParams(CategoryParams),
  validateBody(UpdateCategoryBody),
  updateAdminCategory
);
router.delete('/admin/categories/:id', validateParams(CategoryParams), deleteAdminCategory);

router.get('/admin/posts', listAdminPosts);
router.post('/admin/posts', validateBody(CreatePostBody), createAdminPost);
router.put(
  '/admin/posts/:id',
  validateParams(PostParams),
  validateBody(UpdatePostBody),
  updateAdminPost
);
router.delete('/admin/posts/:id', validateParams(PostParams), deleteAdminPost);

router.post('/admin/upload', uploadPublicAsset);

router.get('/admin/galleries', listAdminGalleries);
router.post('/admin/galleries', validateBody(CreateGalleryBody), createAdminGallery);
router.put(
  '/admin/galleries/:id',
  validateParams(GalleryParams),
  validateBody(UpdateGalleryBody),
  updateAdminGallery
);
router.delete('/admin/galleries/:id', validateParams(GalleryParams), deleteAdminGallery);

router.get('/admin/recruitments', listAdminRecruitments);
router.post('/admin/recruitments', validateBody(CreateRecruitmentBody), createAdminRecruitment);
router.put(
  '/admin/recruitments/:id',
  validateParams(RecruitmentParams),
  validateBody(UpdateRecruitmentBody),
  updateAdminRecruitment
);
router.delete('/admin/recruitments/:id', validateParams(RecruitmentParams), deleteAdminRecruitment);

export default router;
