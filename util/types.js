module.exports = (data) => {
    for (let i in data){
        console.log(i + ': ' + typeof data[i]);
    }
};
