module.exports = (data) => {
    switch (typeof data) {
        case 'object':
            if (Array.isArray(data) && data.length !== 0) {
                const typeArray = {};
                if (data.length !== 0) {
                    for (let i in data) {
                        typeArray[`${data[i]}`] = typeof data[i];
                    }
                    return typeArray;
                }
            } else if (Object.keys('data').length !== 0) {
                const typeObject = {};
                for (let i in data) {
                    typeObject[i] = typeof data[i];
                }
                return typeObject;
            }
            break;
        default:
            return data === null ? null : data.toString() + ': ' + typeof data;
    }
};
