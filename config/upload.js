// 上传配置模块
const multer = require('multer')
const path = require('path')
const fs = require('fs')


// 配置存储规则
const createUploader = (options) => {
    const defaultOptions = {
        subfolder: 'common', // 默认子文件夹（根据业务覆盖）
        allowedMimeTypes: ['image/jpeg', 'image/png'],
        prefix: ''
    }
    const { subfolder, allowedMimeTypes, prefix } = { ...defaultOptions, ...options }

    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            const uploadDir = path.join(__dirname, `../public/${subfolder}`)
            if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })
            cb(null, uploadDir)
        },
        filename: (req, file, cb) => {
            const ext = path.extname(file.originalname)
            const uniqueName = prefix + Date.now() + '-' + Math.round(Math.random() * 1E9) + ext
            cb(null, uniqueName)
        }
    })

    const fileFilter = (req, file, cb) => {
        if (allowedMimeTypes.includes(file.mimetype)) cb(null, true)
        else cb(new Error(`仅允许上传 ${allowedMimeTypes.join(', ')} 格式文件`), false)
    }

    return multer({ storage, fileFilter })
}

module.exports = createUploader