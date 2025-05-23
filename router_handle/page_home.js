// 首页接口处理函数模块
const db = require('../db/index')
require('dotenv').config() //加载配置环境
// 轮播图
exports.uploadBanners = async (req, res) => {
    try {
        // 获取文件信息
        const file = req.file
        if (!file) return res.cc('未上传文件')
        // 构造图片的访问路径（相对url）
        const imageUrl = 'pageHome_img/' + req.file.filename // 访问路径

        // 将路径存入数据库
        const sql = 'insert into home_banners (image_url) values (?)'
        await db.query(sql, [imageUrl], (err, results) => {
            if (err) return res.cc(err)
            // 判断影响行数是否为 1 
            if (results.affectedRows !== 1) return res.cc('上传失败')
            res.send({
                status: 0,
                message: '上传成功'
            })
        })

    } catch (err) {
        res.cc('服务器错误')
    }
}

// 导航栏
exports.uploadNav = async (req, res) => {
    try {
        const userInfo = req.body
        const file = req.file
        if (!file) return res.cc('未上传文件')
        const imageUrl = 'pageHome_img/' + req.file.filename

        const sql = 'insert into home_nav (name,type,icon_url) values (?,?,?)'
        db.query(sql, [userInfo.name, userInfo.type || 'default', imageUrl], (err, results) => {
            if (err) return res.cc(err)
            if (results.affectedRows !== 1) return res.cc('上传失败')
            res.send({
                status: 0,
                message: '上传成功'
            })
        })
    } catch (err) {
        res.cc('服务器错误')
    }
}

// 获取轮播图
exports.pageHomeBannerHandle = async (req, res) => {
    try {
        const limit = parseInt(req.body.limit) || 4  //默认每一页4条
        // const imageUrl = baseUrl + '/pageHome_img/' + req.file.filename   // 访问路径

        const dql = 'select image_url as imageUrl from home_banners order by id desc limit ?'
        await db.query(dql, limit, (err, results) => {
            if (err) return res.cc(err)
            res.send({
                status: 0,
                message: 'succeed',
                name: '轮播图',
                data_url: results.map(item => process.env.baseUrl + item.imageUrl)
            })
        })

    } catch (err) {
        console.error('数据库错误详情:', err);
        res.cc(err)
    }

}


// 获取导航栏
exports.pageHomeNavHandle = async (req, res) => {
    try {
        const limit = parseInt(req.body.limit) || 12
        const dql = 'select name,type,icon_url,categories_id from home_nav limit ? '
        await db.query(dql, limit, (err, results) => {
            if (err) return res.cc(err)
            // 用forEach 给每一个对象里面的icon_url添加前缀 baseurl
            results.forEach(item => {
                item.icon_url = process.env.baseUrl + item.icon_url
            })
            res.send({
                status: 0,
                message: 'succeed',
                name: '导航栏',
                data: results
            })
        })
    } catch (err) {
        console.error('数据库错误详情:', err)
        res.cc(err)
    }
}

// 获取商品卡片数据
exports.pageHomeGoodsListHandle = async (req, res) => {
    try {
        const page = parseInt(req.body.page) || 1  //默认第一页
        const limit = parseInt(req.body.limit) || 10  //默认每一页4条

        //  page 和 limit 是有效数字
        if (isNaN(page) || isNaN(limit)) {
            throw new Error("页面和限制必须是数字");
        }

        // 计算offset(偏移量)
        const offset = (page - 1) * limit
        const dql = `
            select g.id,
            g.title,
            g.price_min,
            g.price_max,
            g.stock,
            g.sales,
            g.id as goods_id,
            g.main_image as 'goods_cover_image'
                from goods g
                group by g.id limit ? offset ?
        `

        db.query(dql, [limit, offset], (err, results) => {
            if (err) return res.cc(err)
            results.forEach(item => item.goods_cover_image = process.env.baseUrl + item.goods_cover_image)
            res.send({
                status: 0,
                message: 'succeed',
                type: '商品',
                data: results
            })
        })
    } catch (err) {
        console.error('数据库错误详情:', err)
        res.cc(err)
    }
}