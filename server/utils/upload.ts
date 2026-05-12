import multer from 'multer';

// Always use memory storage. We will process it in the controller.
// If Cloudinary is available, we upload there. Else we write to local disk.
const storage = multer.memoryStorage();

const fileFilter = (req: any, file: any, cb: any) => {
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('application/pdf')) {
    cb(null, true);
  } else {
    cb(new Error('Hanya file gambar atau PDF yang diizinkan!'), false);
  }
};

export const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

const imageOnlyFilter = (_req: any, file: any, cb: any) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Hanya file gambar yang diizinkan!'), false);
  }
};

export const uploadImageOnly = multer({
  storage: storage,
  fileFilter: imageOnlyFilter,
  limits: {
    fileSize: 3 * 1024 * 1024,
  },
});

const excelFilter = (_req: any, file: any, cb: any) => {
  const ok = new Set([
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ]);
  if (ok.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Hanya file Excel (.xlsx/.xls) yang diizinkan!'), false);
  }
};

export const uploadExcel = multer({
  storage: storage,
  fileFilter: excelFilter,
  limits: {
    fileSize: 2 * 1024 * 1024,
  },
});
