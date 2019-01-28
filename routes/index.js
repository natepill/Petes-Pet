const Pet = require('../models/pet');

module.exports = (app) => {

  /* GET home page. */
  app.get('/', (req, res) => {
   const page = req.query.page || 1

   Pet.paginate({}, {page: page}).then((results) => {
     res.render('pets-index', {pets: results.docs, pagesCount: results.pages, currentPage: page}); // currentPage becomes a string when it is rendered here, so we have to use the parseInt() function in JavaScript to parse the string back into an integer to do math with it.
   });
 });



}
