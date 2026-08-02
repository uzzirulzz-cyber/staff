const bcrypt = require('bcryptjs');
const hash = '$2b$12$J5MlselwTPATOOxD43bfS.ntQEt4YYnIbC/.XeA8agNyQm7LbS2j.';
console.log(bcrypt.compareSync('playbeat123', hash) ? 'MATCH' : 'NO_MATCH');
