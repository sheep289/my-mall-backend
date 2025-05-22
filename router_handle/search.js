const db = require('../db/mysql2')
//搜索查询

exports.handleSearchSelect = async (req,res)  => {
    // 默认页码为1
    const limit = parseInt(req.query.limit) || 50
    const keyword = req.query.keyword || ''
    const categoryId = req.query.categoryId  || ''
    try{
        // 通过搜索查询
        const dql = `
         select g.id,
        g.title,
        g.price_min,
        g.price_max,
        g.stock,
        g.sales,
        gi.goods_id,
        gi.url as 'goods_cover_image'
            from goods g
            left join goods_images gi on g.id = gi.goods_id
            and gi.type = 'cover'
            where g.title like ?
            `
        if(keyword) {
            const [results]  = await db.query(dql,[`%${keyword}%`])
            res.send({
                status:0,
                data:results
            })
            
        }
    }catch(error) {
        console.error("数据库错误详情:", error)
    }
}