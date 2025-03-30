// 定义格式化时间与方法
function dateFormat(dtStr) {
    const date = new Date(dtStr)

    const y = date.getFullYear()
    const m = padZero(date.getMonth() + 1)
    const d = padZero(date.getDate())
    const h = padZero(date.getHours())
    const mm = padZero(date.getMinutes())
    const s = padZero(date.getSeconds())

    return `${y}-${m}-${d} ${h}:${mm}:${s}`
}

// 定义一个补零方法
function padZero(n) {
    return n > 9 ? n : '0' + n
}
module.exports = {
    dateFormat
}