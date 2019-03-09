module.exports = function (req, res, next) {
    for (let keys in req.body) {
        if (req.body[keys].endsWith('\r\r\n'))
            req.body[keys] = req.body[keys].substring(0, req.body[keys].length - 3);
        else if (req.body[keys].endsWith('\r\n'))
            req.body[keys] = req.body[keys].substring(0, req.body[keys].length - 2);
        else if (req.body[keys].endsWith('\r'))
            req.body[keys] = req.body[keys].substring(0, req.body[keys].length - 1);
        else if (req.body[keys].endsWith('\n'))
            req.body[keys] = req.body[keys].substring(0, req.body[keys].length - 1);
    }
    next();
};
