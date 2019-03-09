module.exports = (data) => {
    switch (typeof data) {
        case 'object':
            const typeObject = {};
            if (Object.keys('data').length !== 0) {
                for (let i in data) {
                    typeObject[i] = typeof data[i];
                }
                return typeObject;
            }
            break;
        case 'array':
            const typeArray = {};
            if (data.length !== 0) {
                for (let i in data) {
                    typeArray[data[i]] = typeof data[i];
                }
                return typeArray;
            }
            break;
        default:
            return data === null ? null : typeof data;

    }
};
