const Json = (string) => JSON.stringify(string, null, 2)

const removeAccents = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "")

module.exports = { Json, removeAccents }
