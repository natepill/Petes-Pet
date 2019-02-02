const multer  = require('multer');
const upload = multer({ dest: 'uploads/' });
const Upload = require('s3-uploader');


const nodemailer = require('nodemailer');
const mg = require('nodemailer-mailgun-transport');

const auth = {
    auth: {
        api_key: process.env.MAILGUN_API_KEY,
        domain: process.env.EMAIL_DOMAIN,
    }
}

const nodemailerMailgun = nodemailer.createTransport(mg(auth));



const client = new Upload(process.env.S3_BUCKET, {
  aws: {
    path: 'pets/avatar',
    region: process.env.S3_REGION,
    acl: 'public-read',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  },
  cleanup: {
    versions: true,
    original: true
  },
  versions: [{
    maxWidth: 400,
    aspect: '16:10',
    suffix: '-standard'
  },{
    maxWidth: 300,
    aspect: '1:1',
    suffix: '-square'
  }]
});

// MODELS
const Pet = require('../models/pet');

// PET ROUTES
module.exports = (app) => {

  // SEARCH
  app.get('/search', (req, res) => {

      Pet.find({$text: {$search: req.query.term}},
                {score: {$meta: 'textScore'}}).sort({score: {$meta: 'textScore'}})
                .limit(20)
                .exec(function(err, pets){
                    if (err){return res.status(400).send(err)}

                    if (req.header('Content-Type') == 'application/json') {
                        return res.json({
                            pets: pets,
                            term: req.query.term,
                        });
                    } else {
                        return res.render('pets-index', {
                            pets: pets,
                            term: req.query.term
                        });
                    }
                })
            });



  // NEW PET
  app.get('/pets/new', (req, res) => {
    res.render('pets-new');
  });

  // CREATE PET
  app.post('/pets', upload.single('avatar'), (req, res, next) => {
    var pet = new Pet(req.body);
    pet.save(function (err) {
      if (req.file) {
        client.upload(req.file.path, {}, function (err, versions, meta) {
          if (err) { return res.status(400).send({ err: err }) };

          versions.forEach(function (image) {
            var urlArray = image.url.split('-');
            urlArray.pop();//removes and returns last element in array
            var url = urlArray.join('-');
            pet.avatarUrl = url;
            pet.save();
          });

          res.send({ pet: pet });
        });
      } else {
        res.send({ pet: pet });
      }
    })
  })
  // SHOW PET
  app.get('/pets/:id', (req, res) => {
    Pet.findById(req.params.id).exec((err, pet) => {
      res.render('pets-show', { pet: pet });
    });
  });

  // EDIT PET
  app.get('/pets/:id/edit', (req, res) => {
    Pet.findById(req.params.id).exec((err, pet) => {
      res.render('pets-edit', { pet: pet });
    });
  });

  // UPDATE PET
  app.put('/pets/:id', (req, res) => {
    Pet.findByIdAndUpdate(req.params.id, req.body)
      .then((pet) => {
        res.redirect(`/pets/${pet._id}`)
      })
      .catch((err) => {
        // Handle Errors
      });
  });

  // DELETE PET
  app.delete('/pets/:id', (req, res) => {
    Pet.findByIdAndRemove(req.params.id).exec((err, pet) => {
      return res.redirect('/')
    });
  });


  // PURCHASE PET
   app.post('/pets/:id/purchase', (req, res) => {
       console.log(req.body);

       var stripe = require('stripe')(process.env.PRIVATE_STRIPE_API_KEY);

       const token = req.body.stripeToken;
       Pet.findById(req.body.petId).exec((err, pet) => {
           const charge = stripe.charges.create({
               amount: pet.price * 100,
               currency: 'usd',
               description: `Purchased ${pet.name}, ${pet.species}`,
               source: token,
           })
           .then((charge) => {
               console.log(charge);
               // SEND EMAIL
               const user = {
                 email: req.body.stripeEmail,
                 amount: charge.amount / 100,
                 petName: pet.name,
               };

               nodemailerMailgun.sendMail({
                 from: 'no-reply@example.com',
                 to: user.email, // An array if you have multiple recipients.
                 subject: 'Pet Purchased!',
                 template: {
                   name: 'views/email.handlebars',
                   engine: 'handlebars',
                   context: user
                 }
               }).then(info => {
                 console.log('Response: ' + info);
                 res.redirect(`/pets/${req.params.id}`);
               }).catch(err => {
                 console.log('Error in Mailgun: ' + err);
                 res.redirect(`/pets/${req.params.id}`);
               });
           }).catch(err => {
               console.log('Error In Stripe: ' + err);
           });
       });
   });
}
