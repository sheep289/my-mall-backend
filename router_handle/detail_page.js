const db = require('../db/index')
// 导入指定格式时间模块
const TIME = require('../utils/dateFormat')
// 导入脱敏手机号模块
const desensitization = require('../utils/desensitize')
// 详情页商品以及规处理模块
exports.goodsDetailPageHandle = async (req, res) => {
    try {
        // 需拿到客户端传过来的goodsId
        const goodsId = req.query.goodsId || req.body.goodsId
        if (!goodsId) return res.cc('未传 goodsId ')
        // 1.查询商品信息sql语句
        const dql = `
        select g.id,g.title,g.price_min,g.price_max,g.description,g.sales,g.stock,
        (SELECT JSON_ARRAYAGG(url) FROM goods_images WHERE goods_id = g.id AND type = 'detail') AS detail_images,
        (SELECT JSON_ARRAYAGG(url) FROM goods_images WHERE goods_id = g.id AND type = 'detail_page') AS detail_page_images
        from goods g where g.id = ?`

        // 2.查询商品规格sql语句
        const specs = `
            select s.name 'name',
            s.type 'type',
            s.id as 'specs_id',
            JSON_ARRAYAGG(JSON_OBJECT('id',gs.id,'value',gs.value,'stock',gs.stock,'price',gs.price)) as 'values',
            JSON_ARRAYAGG( gs.image_url) 'color_image_url'
                from goods_specs gs join specs s on gs.spec_id = s.id
                where gs.goods_id = ?  group by s.name
        `

        await db.query(dql, goodsId, (err, results) => {
            if (err) return res.cc(err)
            if (results.length <= 0) return res.cc('请输入有效的goodsId')
            // 查询时JSON_ARRAYAGG(gi.url) as "detail_images 将detail类型照片和并为json字符串
            //   需要将detail_image json字符串还原成数组 （利用json.parse方法）
            let detailData = {
                ...results[0],
                detail_images: JSON.parse(results[0].detail_images),
                detail_page_images: JSON.parse(results[0].detail_page_images),
            }
            db.query(specs, goodsId, (err, results2) => {
                if (err) return res.cc(err)
                // 将json字符串转换为数组
                results2.forEach(item => {
                    item.values = JSON.parse(item.values)
                    item.color_image_url = JSON.parse(item.color_image_url)
                })
                // 将规格数据与详情页的数据合并
                detailData.specs = results2
                res.send({
                    status: 0,
                    message: "succeed",
                    data: detailData
                })
            })

        })
    } catch (err) {
        console.log('数据库错误详情:', err)
        res.cc(err)
    }
}
// 处理用户评论模块

exports.goodsCommentHandle = async (req, res) => {
    try {
        // 客户端携带goodsId limit(可选 默认为4)
        const goodsId = req.query.goodsId || req.body.goodsId
        const limit = parseInt(req.body.limit) || 4
        if (!goodsId) return res.cc('未传 goodsId ')
        if (isNaN(limit)) {
            throw new Error("页面和限制必须是数字");
        }
        const baseUrl = 'http://127.0.0.1/'   // 根据实际部署环境调整
        const dql = `
            select
        u.username as 'username',u.nickname 'nick_name',u.avatar 'head_portrait',u.default_avatar 'default_head_portrait',ugc.goods_id 'goodsID',ugc.goods_comment as'goods_comment',JSON_ARRAY(ugc.comment_images) 'comment_images',ugc.rating 'goods_rating',ugc.created_at 'comment_timer'
        from users u join users_goods_comment ugc on u.id = ugc.user_id
        where ugc.goods_id = ?
        order by ugc.rating desc,ugc.created_at desc limit ?;
        `
        await db.query(dql, [goodsId, limit], (err, results) => {
            if (results.length <= 0) return res.cc('请输入有效的goodsId')
            results.forEach(item => {
                item.comment_timer = TIME.dateFormat(item.comment_timer)
                item.username = desensitization.desensitizePhone(item.username)
                item.default_head_portrait = baseUrl + item.default_head_portrait
                item.head_portrait = item.head_portrait ? baseUrl + item.head_portrait : item.head_portrait
                item.comment_images = JSON.parse(item.comment_images).filter(img => img != null && img.trim() !== '').map(img => baseUrl + img) 
            })
            if (err) return res.cc(err)
            res.send({
                status: 0,
                message: "succeed",
                data: results
            })
        })

    } catch (err) {
        console.log('数据库错误详情:', err)
        res.cc(err)
    }
}