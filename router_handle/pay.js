const db = require('../db/mysql2')
exports.checkoutOrderhandle = async (req, res) => {
    try {
        // 从token中拿到用户id
        const userId = req.auth.id

        const mode =req.query.mode ||  req.body.mode
        /* 客户端需要携带 购物车id/商品id(取决于mode类型是buyNow,cart) 
            buyNow: 需要携带参数: userId goodsId 商品规格，商品数量
            cart: 需要携带参数 ： userid cartId  
        */

        if (mode === 'buyNow') {
            const goodsId =  parseInt(req.query.goodsId) || parseInt(req.body.goodsId)
            const specValueIds = JSON.stringify(req.query.specValueIds) ||  JSON.stringify(req.body.specValueIds)
            const quantity =parseInt(req.query.quantity)  || parseInt(req.body.quantity)

            //用户端携带立即购买相应的商品参数响应对应的商品信息 （mode,goodsId,规格，数量）
        if (!specValueIds) return res.cc('请选择规格')
            const getBuyNowDataDql = `
                select
                    g.id as 'goods_id',
                    g.title as 'goods_title',
                    gi.url as 'goods_coverImg',
                    gs.image_url 'color_image',
                (SELECT value FROM goods_specs
                    WHERE goods_id = g.id
                        AND spec_id = 1
                        AND id = JSON_UNQUOTE(JSON_EXTRACT('${specValueIds}', '$.color'))) AS color_name,
                (SELECT value FROM goods_specs
                    WHERE goods_id = g.id
                        AND spec_id = 2
                        AND id = JSON_UNQUOTE(JSON_EXTRACT('${specValueIds}', '$.memory'))) AS memory_name,
                (SELECT image_url FROM goods_specs
                    WHERE goods_id = g.id
                        AND spec_id = 1
                        AND id = JSON_UNQUOTE(JSON_EXTRACT('${specValueIds}', '$.color'))) AS color_image,
                (SELECT price FROM goods_specs
                    WHERE goods_id = g.id
                        AND spec_id = 2
                        AND id = JSON_UNQUOTE(JSON_EXTRACT('${specValueIds}', '$.memory'))) AS price,
                (SELECT price FROM goods_specs
                    WHERE goods_id = g.id
                        AND spec_id = 2
                        AND id = JSON_UNQUOTE(JSON_EXTRACT('${specValueIds}', '$.memory'))) * ${quantity} AS total_price
                    from
                    goods g
                left join goods_images gi on g.id = gi.goods_id
                left join goods_specs gs on g.id = gs.goods_id
                where g.id = ? and gi.type = 'cover'
                group by g.id
            `
            const [results] = await db.query(getBuyNowDataDql, [goodsId])
            results.forEach(item => {
                item.quantity = quantity
            })
            res.send({
                status: 0,
                mode: 'buyNow',
                data: results
            })


        } else if (mode === 'cart') {
            // 如果是通过购物车结算,这订单信息内容直接从carts表中获取并响应
            // 1.获取携带的参数
            const cartIds = req.body.cartIds || req.query.cartIds
            // 1.1占位符数量 (根据数组长度也就是需查看cartId的个数生成对应的占位符)
            if(!Array.isArray(cartIds)) return res.cc('获取失败，请重试')
            const placeholders = cartIds.map(() => '?').join(',')

            const getCarDatatDql = `
            SELECT
                c.id AS cart_id,
                c.goods_id,
                g.title AS goods_title,
                c.quantity,
                gi.url goods_coverImg,
                color_gs.image_url AS color_image,
                color_gs.value AS color_name,
                memory_gs.value AS memory_name,
                memory_gs.price * c.quantity AS total_price,
                (SELECT price FROM goods_specs
                WHERE goods_id = c.goods_id
                AND spec_id = 2
                AND id = JSON_UNQUOTE(JSON_EXTRACT(c.specs, '$.memory'))) AS price
                FROM carts c
                JOIN goods g ON c.goods_id = g.id
                LEFT JOIN goods_specs color_gs
                ON color_gs.id = JSON_UNQUOTE(JSON_EXTRACT(c.specs, '$.color'))
                AND color_gs.goods_id = c.goods_id
                AND color_gs.spec_id = 1
                LEFT JOIN goods_specs memory_gs
                ON memory_gs.id = JSON_UNQUOTE(JSON_EXTRACT(c.specs, '$.memory'))
                AND memory_gs.goods_id = c.goods_id
                AND memory_gs.spec_id = 2
                JOIN goods_images gi ON g.id = gi.goods_id
                AND gi.type = 'cover'
                WHERE c.user_id = ? AND c.id in (${placeholders})
                ORDER BY c.id DESC
            `
            const [results] = await db.query(getCarDatatDql, [userId,...cartIds])
            res.send({
                status:0,
                mode:'cart',
                data:results
            })

        } else {
            return res.cc('mode参数为：cart或者buyNow')
        }

    } catch (error) {
        console.error('数据库错误详情:', error)
        res.cc('获取失败，请重试')
    }
}
